import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { createEvent, type WorkflowEvent } from '@/features/mastra/events/types';
import {
    CONSENSUS_ANALYSIS_MODELS,
    CONSENSUS_ANALYSIS_SYSTEM_PROMPT,
    CONSENSUS_SYNTHESIS_SYSTEM_PROMPT,
    buildConsensusAnalysisPrompt,
    buildConsensusSynthesisPrompt,
} from '@/features/agents/lib/graphs/consensus';
import {
    ConsensusReportSchema,
    ModelAnalysisSchema,
    type ConsensusReport,
    type ModelAnalysis,
} from '@/features/agents/lib/schemas';
import {
    getOrFetchSnapshot,
    extractStockInfo,
    type FastFinanceResponse,
} from '@/features/agents/lib/services/facts-snapshot-service';
import {
    buildContextPack,
    searchExa,
    searchPerplexity,
    type ContextPack,
} from '@/features/agents/lib/services/context-pack';
import { generateStructuredOutput, MODELS } from '@/features/agents/lib/services/llm-client';
import { db } from '@/lib/db/drizzle';
import {
    agentRunSteps,
    reports,
    reportSections,
    AGENT_RUN_STATUS,
    AGENT_STEP_STATUS,
    type FactsSnapshot,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

import { WORKFLOW_EVENT_EMITTER_KEY, type WorkflowEventEmitter } from './context';
import { updateAgentRunStatus, updateAgentRunStepStatus } from './persistence';

const ConsensusWorkflowInputSchema = z.object({
    runDbId: z.number().int(),
    steps: z.object({
        fetchDataStepDbId: z.number().int(),
        parallelAnalysisStepDbId: z.number().int(),
        synthesizeConsensusStepDbId: z.number().int(),
    }),
    stockSymbol: z.string().min(1),
    exchangeAcronym: z.string().min(1),
    forceRefresh: z.boolean().optional(),
});

type ConsensusWorkflowInput = z.infer<typeof ConsensusWorkflowInputSchema>;

const ConsensusWorkflowOutputSchema = z.object({
    runDbId: z.number().int(),
    report: ConsensusReportSchema,
    modelAnalyses: z.array(ModelAnalysisSchema),
    reportDbId: z.number().int(),
});

type ConsensusWorkflowOutput = z.infer<typeof ConsensusWorkflowOutputSchema>;

const ConsensusWorkflowStateSchema = z.object({
    startedAtMs: z.number().int().optional(),
    snapshot: z.unknown().optional(),
    snapshotDbId: z.number().int().optional(),
    contextPack: z.unknown().optional(),
    modelAnalyses: z.unknown().optional(),
    report: z.unknown().optional(),
    reportDbId: z.number().int().optional(),
});

type ConsensusWorkflowState = z.infer<typeof ConsensusWorkflowStateSchema>;

function getEmitter(requestContext: { get: (key: string) => unknown }): WorkflowEventEmitter | undefined {
    const maybe = requestContext.get(WORKFLOW_EVENT_EMITTER_KEY);
    return typeof maybe === 'function' ? (maybe as WorkflowEventEmitter) : undefined;
}

async function emit(requestContext: { get: (key: string) => unknown }, event: WorkflowEvent) {
    const emitter = getEmitter(requestContext);
    if (!emitter) return;
    await emitter(event);
}

function toFactsSnapshot(value: unknown): FactsSnapshot {
    return value as FactsSnapshot;
}

function toModelAnalyses(value: unknown): ModelAnalysis[] {
    return value as ModelAnalysis[];
}

function toConsensusReport(value: unknown): ConsensusReport {
    return value as ConsensusReport;
}

export const consensusWorkflow = createWorkflow({
    id: 'consensus-workflow',
    description: 'Consensus workflow with DB persistence and event protocol streaming',
    inputSchema: ConsensusWorkflowInputSchema,
    stateSchema: ConsensusWorkflowStateSchema,
    outputSchema: ConsensusWorkflowOutputSchema,
})
    .then(
        createStep({
            id: 'entry',
            inputSchema: ConsensusWorkflowInputSchema,
            outputSchema: z.object({}),
            async execute({ inputData, requestContext, setState }) {
                await setState({
                    startedAtMs: Date.now(),
                });

                await emit(
                    requestContext,
                    createEvent('stage', {
                        stage: 'consensus.entry',
                        progress: 0,
                        message: `Starting consensus run ${inputData.runDbId}`,
                    }),
                );

                return {};
            },
        }),
    )
    .then(
        createStep({
            id: 'fetch_data',
            inputSchema: z.object({}),
            outputSchema: z.object({}),
            async execute({ getInitData, requestContext, state, setState }) {
                const init = getInitData<ConsensusWorkflowInput>();

                await emit(
                    requestContext,
                    createEvent('stage', {
                        stage: 'consensus.fetch_data',
                        progress: 0.05,
                        message: `Fetching snapshot for ${init.stockSymbol}:${init.exchangeAcronym}`,
                    }),
                );
                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(init.steps.fetchDataStepDbId),
                        percent: 0,
                        message: 'Starting fetch_data',
                    }),
                );

                await updateAgentRunStatus({ runDbId: init.runDbId, status: AGENT_RUN_STATUS.RUNNING });
                await updateAgentRunStepStatus({
                    stepDbId: init.steps.fetchDataStepDbId,
                    status: AGENT_STEP_STATUS.RUNNING,
                });

                const snapshotCallId = `snapshot-${init.runDbId}-${Date.now()}`;
                await emit(
                    requestContext,
                    createEvent('tool-call', {
                        toolName: 'getStockSnapshot',
                        callId: snapshotCallId,
                        args: {
                            stockSymbol: init.stockSymbol,
                            exchangeAcronym: init.exchangeAcronym,
                            forceRefresh: init.forceRefresh ?? false,
                        },
                    }),
                );

                const snapshot = await getOrFetchSnapshot(init.stockSymbol, init.exchangeAcronym, {
                    forceRefresh: init.forceRefresh,
                });

                await emit(
                    requestContext,
                    createEvent('tool-result', {
                        callId: snapshotCallId,
                        result: {
                            snapshotId: snapshot.id,
                            fetchedAt: snapshot.fetchedAt,
                        },
                    }),
                );

                await updateAgentRunStatus({
                    runDbId: init.runDbId,
                    status: AGENT_RUN_STATUS.RUNNING,
                    factsSnapshotId: snapshot.id,
                });

                const stockInfo = extractStockInfo(snapshot);
                await emit(
                    requestContext,
                    createEvent('sources', {
                        sources: [
                            {
                                title: `${stockInfo.symbol} snapshot`,
                                url: `snapshot:${snapshot.id}`,
                                sourceType: 'snapshot',
                            },
                        ],
                    }),
                );

                const contextQuery = `${stockInfo.symbol} ${stockInfo.name ?? ''} analyst consensus outlook`;
                const contextSources: ContextPack['sources'] = [];
                const contextProviders: ContextPack['providers'] = {};
                let contextPack: ContextPack | undefined;

                if (process.env.EXA_API_KEY) {
                    const exaCallId = `exa-${init.runDbId}-${Date.now()}`;
                    await emit(
                        requestContext,
                        createEvent('tool-call', {
                            toolName: 'exa.search',
                            callId: exaCallId,
                            args: { query: contextQuery },
                        }),
                    );
                    try {
                        const exaResult = await searchExa(contextQuery, { numResults: 6 });
                        await emit(
                            requestContext,
                            createEvent('tool-result', {
                                callId: exaCallId,
                                result: {
                                    count: exaResult?.sources.length ?? 0,
                                    requestId: exaResult?.requestId,
                                },
                            }),
                        );
                        if (exaResult) {
                            contextSources.push(...exaResult.sources);
                            contextProviders.exa = {
                                requestId: exaResult.requestId,
                                resultCount: exaResult.sources.length,
                                context: exaResult.context,
                            };
                        }
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Exa search failed';
                        await emit(
                            requestContext,
                            createEvent('error', {
                                stepId: String(init.steps.fetchDataStepDbId),
                                message,
                                recoverable: true,
                            }),
                        );
                    }
                }

                if (process.env.PERPLEXITY_API_KEY) {
                    const pplxCallId = `pplx-${init.runDbId}-${Date.now()}`;
                    await emit(
                        requestContext,
                        createEvent('tool-call', {
                            toolName: 'perplexity.search',
                            callId: pplxCallId,
                            args: { query: contextQuery },
                        }),
                    );
                    try {
                        const pplxResult = await searchPerplexity(contextQuery, { maxResults: 6 });
                        await emit(
                            requestContext,
                            createEvent('tool-result', {
                                callId: pplxCallId,
                                result: {
                                    count: pplxResult?.sources.length ?? 0,
                                    id: pplxResult?.id,
                                },
                            }),
                        );
                        if (pplxResult) {
                            contextSources.push(...pplxResult.sources);
                            contextProviders.perplexity = {
                                id: pplxResult.id,
                                resultCount: pplxResult.sources.length,
                            };
                        }
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Perplexity search failed';
                        await emit(
                            requestContext,
                            createEvent('error', {
                                stepId: String(init.steps.fetchDataStepDbId),
                                message,
                                recoverable: true,
                            }),
                        );
                    }
                }

                if (contextSources.length > 0) {
                    contextPack = buildContextPack({
                        query: contextQuery,
                        sources: contextSources,
                        providers: contextProviders,
                    });
                    await emit(
                        requestContext,
                        createEvent('sources', {
                            sources: contextPack.sources,
                        }),
                    );
                }

                await updateAgentRunStepStatus({
                    stepDbId: init.steps.fetchDataStepDbId,
                    status: AGENT_STEP_STATUS.COMPLETED,
                    output: { snapshotId: snapshot.id, contextPack },
                });
                await emit(
                    requestContext,
                    createEvent('artifact', {
                        stepId: String(init.steps.fetchDataStepDbId),
                        artifactType: 'summary',
                        data: {
                            snapshotId: snapshot.id,
                            stock: {
                                symbol: stockInfo.symbol,
                                exchange: stockInfo.exchange,
                                name: stockInfo.name ?? null,
                                sector: stockInfo.sector ?? null,
                                industry: stockInfo.industry ?? null,
                            },
                        },
                    }),
                );
                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(init.steps.fetchDataStepDbId),
                        percent: 100,
                        message: 'Completed fetch_data',
                    }),
                );

                await setState({
                    ...state,
                    snapshot,
                    snapshotDbId: snapshot.id,
                    contextPack,
                });

                return {};
            },
        }),
    )
    .then(
        createStep({
            id: 'parallel_analysis',
            inputSchema: z.object({}),
            outputSchema: z.object({}),
            async execute({ getInitData, requestContext, state, setState }) {
                const init = getInitData<ConsensusWorkflowInput>();
                const snapshot = toFactsSnapshot(state.snapshot);

                await emit(
                    requestContext,
                    createEvent('stage', {
                        stage: 'consensus.parallel_analysis',
                        progress: 0.35,
                        message: 'Running parallel model analyses',
                    }),
                );
                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(init.steps.parallelAnalysisStepDbId),
                        percent: 0,
                        message: 'Starting parallel_analysis',
                    }),
                );

                await updateAgentRunStepStatus({
                    stepDbId: init.steps.parallelAnalysisStepDbId,
                    status: AGENT_STEP_STATUS.RUNNING,
                });

                // 发送思考事件：开始分析市场数据
                await emit(
                    requestContext,
                    createEvent('thinking', {
                        message: 'Analyzing market data...',
                    }),
                );

                const analysisPrompt = buildConsensusAnalysisPrompt(snapshot);
                const models = [...CONSENSUS_ANALYSIS_MODELS].sort();

                await emit(
                    requestContext,
                    createEvent('branch-status', {
                        branches: models.map((modelId) => ({
                            id: modelId,
                            status: 'pending',
                        })),
                    }),
                );

                // 并行调用多个模型进行分析，配置超时和重试策略 + 分支状态
                const modelResults = await Promise.all(
                    models.map(async (modelId) => {
                        const startedAt = Date.now();
                        await emit(
                            requestContext,
                            createEvent('branch-status', {
                                branches: [{ id: modelId, status: 'running' }],
                            }),
                        );

                        try {
                            const result = await generateStructuredOutput(ModelAnalysisSchema, analysisPrompt, {
                                modelId,
                                system: CONSENSUS_ANALYSIS_SYSTEM_PROMPT,
                                temperature: 0.7,
                                timeout: 600000,
                                maxRetries: 3,
                            });
                            const durationMs = Date.now() - startedAt;
                            await emit(
                                requestContext,
                                createEvent('branch-status', {
                                    branches: [{ id: modelId, status: 'completed', durationMs }],
                                }),
                            );
                            return { modelId, result, durationMs };
                        } catch (error) {
                            const durationMs = Date.now() - startedAt;
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            await emit(
                                requestContext,
                                createEvent('branch-status', {
                                    branches: [{ id: modelId, status: 'failed', durationMs }],
                                }),
                            );
                            return {
                                modelId,
                                result: null as unknown as ModelAnalysis,
                                error: errorMessage,
                                durationMs,
                            };
                        }
                    }),
                );

                // 过滤有效分析结果
                const validAnalyses = modelResults
                    .filter((r) => !r.error && r.result)
                    .map((r) => ({ ...r.result, modelId: r.modelId }))
                    .sort((a, b) => a.modelId.localeCompare(b.modelId));

                // 弹性检查：至少需要2个有效分析结果才能形成有意义的共识
                if (validAnalyses.length < 2) {
                    throw new Error('Insufficient valid analyses for consensus: need at least 2 models');
                }

                await emit(
                    requestContext,
                    createEvent('sources', {
                        sources: validAnalyses.map((analysis) => ({
                            title: `${analysis.modelId} analysis`,
                            sourceType: 'model',
                        })),
                    }),
                );

                await updateAgentRunStepStatus({
                    stepDbId: init.steps.parallelAnalysisStepDbId,
                    status: AGENT_STEP_STATUS.COMPLETED,
                    output: {
                        analysisCount: validAnalyses.length,
                        models: validAnalyses.map((a) => a.modelId),
                    },
                    metadata: {
                        requestedModels: models,
                        failures: modelResults
                            .filter((r) => r.error)
                            .map((r) => ({ modelId: r.modelId, error: r.error })),
                        durations: modelResults.map((r) => ({
                            modelId: r.modelId,
                            durationMs: r.durationMs,
                        })),
                    },
                });

                for (const analysis of validAnalyses) {
                    await emit(
                        requestContext,
                        createEvent('artifact', {
                            stepId: String(init.steps.parallelAnalysisStepDbId),
                            artifactType: 'stance',
                            data: {
                                modelId: analysis.modelId,
                                stance: analysis.stance,
                                confidence: analysis.confidence,
                                stanceSummary: analysis.stanceSummary,
                            },
                        }),
                    );
                }

                await emit(
                    requestContext,
                    createEvent('step-summary', {
                        stepId: String(init.steps.parallelAnalysisStepDbId),
                        summary: `完成 ${validAnalyses.length} 个模型分支分析`,
                    }),
                );

                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(init.steps.parallelAnalysisStepDbId),
                        percent: 100,
                        message: 'Completed parallel_analysis',
                    }),
                );

                await setState({
                    ...state,
                    modelAnalyses: validAnalyses,
                });

                return {};
            },
        }),
    )
    .then(
        createStep({
            id: 'synthesize_consensus',
            inputSchema: z.object({}),
            outputSchema: ConsensusWorkflowOutputSchema,
            async execute({ getInitData, requestContext, state, setState }) {
                const init = getInitData<ConsensusWorkflowInput>();
                const snapshot = toFactsSnapshot(state.snapshot);
                const modelAnalyses = toModelAnalyses(state.modelAnalyses);
                const contextPack = state.contextPack;

                await emit(
                    requestContext,
                    createEvent('stage', {
                        stage: 'consensus.synthesize',
                        progress: 0.75,
                        message: 'Synthesizing consensus report',
                    }),
                );
                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(init.steps.synthesizeConsensusStepDbId),
                        percent: 0,
                        message: 'Starting synthesize_consensus',
                    }),
                );

                await updateAgentRunStepStatus({
                    stepDbId: init.steps.synthesizeConsensusStepDbId,
                    status: AGENT_STEP_STATUS.RUNNING,
                });

                // 发送思考事件：开始综合各模型分析结果
                await emit(
                    requestContext,
                    createEvent('thinking', {
                        message: 'Synthesizing consensus view...',
                    }),
                );

                const synthesisPrompt = buildConsensusSynthesisPrompt(modelAnalyses);
                // 生成共识报告，配置超时和重试策略
                const report = await generateStructuredOutput(ConsensusReportSchema, synthesisPrompt, {
                    modelId: MODELS.DEFAULT,
                    system: CONSENSUS_SYNTHESIS_SYSTEM_PROMPT,
                    temperature: 0.5,
                    timeout: 600000,
                    maxRetries: 3,
                });

                await updateAgentRunStepStatus({
                    stepDbId: init.steps.synthesizeConsensusStepDbId,
                    status: AGENT_STEP_STATUS.COMPLETED,
                    output: report,
                });

                const stockInfo = extractStockInfo(snapshot);
                const [createdReport] = await db
                    .insert(reports)
                    .values({
                        agentRunId: init.runDbId,
                        reportType: 'consensus',
                        title: report.title,
                        summary: report.overallSummary,
                        structuredData: report as unknown as Record<string, unknown>,
                        sources: {
                            snapshot: state.snapshotDbId,
                            models: modelAnalyses.map((a) => a.modelId),
                            contextPack: contextPack ?? null,
                        },
                    })
                    .returning();

                await db.insert(reportSections).values(
                    modelAnalyses
                        .slice()
                        .sort((a, b) => a.modelId.localeCompare(b.modelId))
                        .map((analysis, index) => ({
                            reportId: createdReport.id,
                            sectionName: `model_analysis_${analysis.modelId}`,
                            sectionOrder: index + 1,
                            modelId: analysis.modelId,
                            title: `${analysis.modelId} Analysis`,
                            content:
                                analysis.report?.summary ??
                                analysis.analysis,
                            stance: analysis.stance,
                            stanceSummary: analysis.stanceSummary,
                            structuredData: analysis as unknown as Record<string, unknown>,
                        })),
                );

                await updateAgentRunStatus({
                    runDbId: init.runDbId,
                    status: AGENT_RUN_STATUS.COMPLETED,
                    output: report,
                });

                await emit(
                    requestContext,
                    createEvent('report', {
                        reportId: createdReport.id,
                        reportType: 'consensus',
                        report,
                        runId: init.runDbId,
                    }),
                );

                await emit(
                    requestContext,
                    createEvent('artifact', {
                        stepId: String(init.steps.synthesizeConsensusStepDbId),
                        artifactType: 'summary',
                        data: {
                            stock: {
                                symbol: stockInfo.symbol,
                                exchange: stockInfo.exchange,
                                name: stockInfo.name ?? null,
                            },
                            title: report.title,
                            overallStance: report.overallStance,
                            overallConfidence: report.overallConfidence,
                            overallSummary: report.overallSummary,
                        },
                    }),
                );

                for (const disagreement of report.disagreementPoints ?? []) {
                    const views = disagreement.positions
                        .flatMap((p) =>
                            p.models.map((modelId) => ({
                                analyst: modelId,
                                stance: p.stance,
                                reasoning: p.rationale,
                            })),
                        )
                        .sort((a, b) => a.analyst.localeCompare(b.analyst));

                    await emit(
                        requestContext,
                        createEvent('divergence', {
                            topic: disagreement.topic,
                            views,
                        }),
                    );
                }

                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(init.steps.synthesizeConsensusStepDbId),
                        percent: 100,
                        message: 'Completed synthesize_consensus',
                    }),
                );

                const duration = Date.now() - (state.startedAtMs ?? Date.now());
                const resultPayload = {
                    runDbId: init.runDbId,
                    reportDbId: createdReport.id,
                    report,
                    modelAnalyses,
                    snapshotId: state.snapshotDbId,
                    stockSymbol: init.stockSymbol,
                    exchangeAcronym: init.exchangeAcronym,
                } satisfies Record<string, unknown>;

                await emit(
                    requestContext,
                    createEvent('complete', {
                        result: resultPayload,
                        duration,
                    }),
                );

                await setState({
                    ...state,
                    report,
                    reportDbId: createdReport.id,
                });

                return {
                    runDbId: init.runDbId,
                    reportDbId: createdReport.id,
                    report,
                    modelAnalyses,
                };
            },
        }),
    )
    .commit();
