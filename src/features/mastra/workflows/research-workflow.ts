import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

import { createEvent, type WorkflowEvent } from '@/features/mastra/events/types';
import {
    RESEARCH_ROLE_DEFINITIONS,
    buildResearchPlanningPrompt,
    buildResearchTaskPrompt,
    buildResearchSynthesisPrompt,
} from '@/features/agents/lib/graphs/research';
import {
    ResearchPlanSchema,
    ResearchFindingSchema,
    ResearchReportSchema,
    type ResearchPlan,
    type ResearchFinding,
    type ResearchReport,
    type ResearchTask,
} from '@/features/agents/lib/schemas';
import { getOrFetchSnapshot, extractStockInfo } from '@/features/agents/lib/services/facts-snapshot-service';
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

const ResearchWorkflowInputSchema = z.object({
    runDbId: z.number().int(),
    steps: z.object({
        fetchDataStepDbId: z.number().int(),
        createPlanStepDbId: z.number().int(),
    }),
    stockSymbol: z.string().min(1),
    exchangeAcronym: z.string().min(1),
    query: z.string().min(1),
    forceRefresh: z.boolean().optional(),
});

type ResearchWorkflowInput = z.infer<typeof ResearchWorkflowInputSchema>;

const ResearchWorkflowOutputSchema = z.object({
    runDbId: z.number().int(),
    reportDbId: z.number().int(),
    report: ResearchReportSchema,
    plan: ResearchPlanSchema,
    findings: z.array(ResearchFindingSchema),
});

type ResearchWorkflowOutput = z.infer<typeof ResearchWorkflowOutputSchema>;

const ResearchWorkflowStateSchema = z.object({
    startedAtMs: z.number().int(),
    snapshot: z.unknown().optional(),
    snapshotDbId: z.number().int().optional(),
    plan: z.unknown().optional(),
    findings: z.unknown().optional(),
    reportDbId: z.number().int().optional(),
    report: z.unknown().optional(),
});

type ResearchWorkflowState = z.infer<typeof ResearchWorkflowStateSchema>;

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

function toResearchPlan(value: unknown): ResearchPlan {
    return value as ResearchPlan;
}

function toResearchFindings(value: unknown): ResearchFinding[] {
    return value as ResearchFinding[];
}

function normalizeTasks(plan: ResearchPlan): ResearchTask[] {
    // Ensure deterministic order for persisted steps.
    return plan.subQuestions
        .slice()
        .sort((a, b) => (a.priority + a.taskId).localeCompare(b.priority + b.taskId));
}

export const researchWorkflow = createWorkflow({
    id: 'research-workflow',
    description: 'Research workflow with DB persistence and event protocol streaming',
    inputSchema: ResearchWorkflowInputSchema,
    stateSchema: ResearchWorkflowStateSchema,
    outputSchema: ResearchWorkflowOutputSchema,
})
    .then(
        createStep({
            id: 'entry',
            inputSchema: ResearchWorkflowInputSchema,
            outputSchema: z.object({}),
            async execute({ inputData, requestContext, setState }) {
                await setState({ startedAtMs: Date.now() });

                await emit(
                    requestContext,
                    createEvent('stage', {
                        stage: 'research.entry',
                        progress: 0,
                        message: `Starting research run ${inputData.runDbId}`,
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
                const init = getInitData<ResearchWorkflowInput>();

                await emit(
                    requestContext,
                    createEvent('stage', {
                        stage: 'research.fetch_data',
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

                const snapshot = await getOrFetchSnapshot(init.stockSymbol, init.exchangeAcronym, {
                    forceRefresh: init.forceRefresh,
                });

                await updateAgentRunStatus({
                    runDbId: init.runDbId,
                    status: AGENT_RUN_STATUS.RUNNING,
                    factsSnapshotId: snapshot.id,
                });
                await updateAgentRunStepStatus({
                    stepDbId: init.steps.fetchDataStepDbId,
                    status: AGENT_STEP_STATUS.COMPLETED,
                    output: { snapshotId: snapshot.id },
                });

                const stockInfo = extractStockInfo(snapshot);
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

                await setState({ ...state, snapshot, snapshotDbId: snapshot.id });
                return {};
            },
        }),
    )
    .then(
        createStep({
            id: 'create_plan',
            inputSchema: z.object({}),
            outputSchema: z.object({}),
            async execute({ getInitData, requestContext, state, setState }) {
                const init = getInitData<ResearchWorkflowInput>();
                const snapshot = toFactsSnapshot(state.snapshot);

                await emit(
                    requestContext,
                    createEvent('stage', {
                        stage: 'research.create_plan',
                        progress: 0.25,
                        message: 'Creating research plan',
                    }),
                );
                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(init.steps.createPlanStepDbId),
                        percent: 0,
                        message: 'Starting create_plan',
                    }),
                );

                await updateAgentRunStepStatus({
                    stepDbId: init.steps.createPlanStepDbId,
                    status: AGENT_STEP_STATUS.RUNNING,
                });

                const planningPrompt = buildResearchPlanningPrompt(init.query, snapshot);
                const plan = await generateStructuredOutput(ResearchPlanSchema, planningPrompt, {
                    modelId: MODELS.DEFAULT,
                    system: 'You are a research planner. Create focused, answerable research tasks.',
                    temperature: 0.5,
                });

                await updateAgentRunStepStatus({
                    stepDbId: init.steps.createPlanStepDbId,
                    status: AGENT_STEP_STATUS.COMPLETED,
                    output: plan,
                });

                const normalizedTasks = normalizeTasks(plan);
                await emit(
                    requestContext,
                    createEvent('artifact', {
                        stepId: String(init.steps.createPlanStepDbId),
                        artifactType: 'summary',
                        data: {
                            mainQuestion: plan.mainQuestion,
                            expectedDeliverables: plan.expectedDeliverables,
                            tasks: normalizedTasks.map((t) => ({
                                taskId: t.taskId,
                                role: t.role,
                                priority: t.priority,
                                question: t.question,
                                roleDescription:
                                    RESEARCH_ROLE_DEFINITIONS.find((r) => r.role === t.role)
                                        ?.description ?? null,
                            })),
                        },
                    }),
                );
                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(init.steps.createPlanStepDbId),
                        percent: 100,
                        message: 'Completed create_plan',
                    }),
                );

                await setState({ ...state, plan: { ...plan, subQuestions: normalizedTasks } });
                return {};
            },
        }),
    )
    .then(
        createStep({
            id: 'run_research_tasks',
            inputSchema: z.object({}),
            outputSchema: z.object({}),
            async execute({ getInitData, requestContext, state, setState }) {
                const init = getInitData<ResearchWorkflowInput>();
                const snapshot = toFactsSnapshot(state.snapshot);
                const plan = toResearchPlan(state.plan);

                await emit(
                    requestContext,
                    createEvent('stage', {
                        stage: 'research.tasks',
                        progress: 0.45,
                        message: 'Running research tasks',
                    }),
                );

                const tasks = normalizeTasks(plan);
                const createdSteps = await db
                    .insert(agentRunSteps)
                    .values(
                        tasks.map((task, index) => ({
                            agentRunId: init.runDbId,
                            stepName: `research_${task.role}_${task.taskId}`,
                            stepOrder: 3 + index,
                            status: AGENT_STEP_STATUS.PENDING,
                            input: task as unknown as Record<string, unknown>,
                        })),
                    )
                    .returning();

                const findings: ResearchFinding[] = [];

                for (let i = 0; i < tasks.length; i++) {
                    const task = tasks[i];
                    const step = createdSteps[i];

                    await emit(
                        requestContext,
                        createEvent('progress', {
                            stepId: String(step.id),
                            percent: 0,
                            message: `Starting ${task.role}`,
                        }),
                    );

                    await updateAgentRunStepStatus({ stepDbId: step.id, status: AGENT_STEP_STATUS.RUNNING });

                    try {
                        const prompt = buildResearchTaskPrompt(task, snapshot);
                        const finding = await generateStructuredOutput(ResearchFindingSchema, prompt, {
                            modelId: MODELS.DEFAULT,
                            temperature: 0.7,
                        });

                        findings.push(finding);

                        await updateAgentRunStepStatus({
                            stepDbId: step.id,
                            status: AGENT_STEP_STATUS.COMPLETED,
                            output: finding,
                        });

                        await emit(
                            requestContext,
                            createEvent('artifact', {
                                stepId: String(step.id),
                                artifactType: 'evidence',
                                data: {
                                    taskId: finding.taskId,
                                    role: finding.role,
                                    summary: finding.summary,
                                    evidence: finding.evidence,
                                    limitations: finding.limitations,
                                },
                            }),
                        );
                        await emit(
                            requestContext,
                            createEvent('progress', {
                                stepId: String(step.id),
                                percent: 100,
                                message: `Completed ${task.role}`,
                            }),
                        );
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        await updateAgentRunStepStatus({
                            stepDbId: step.id,
                            status: AGENT_STEP_STATUS.FAILED,
                            error: errorMessage,
                        });
                        await emit(
                            requestContext,
                            createEvent('error', {
                                stepId: String(step.id),
                                message: errorMessage,
                                recoverable: true,
                            }),
                        );
                    }
                }

                if (findings.length === 0) {
                    throw new Error('All research tasks failed');
                }

                await setState({ ...state, findings });
                return {};
            },
        }),
    )
    .then(
        createStep({
            id: 'synthesize_report',
            inputSchema: z.object({}),
            outputSchema: ResearchWorkflowOutputSchema,
            async execute({ getInitData, requestContext, state, setState }) {
                const init = getInitData<ResearchWorkflowInput>();
                const snapshot = toFactsSnapshot(state.snapshot);
                const plan = toResearchPlan(state.plan);
                const findings = toResearchFindings(state.findings);

                const [synthesisStep] = await db
                    .insert(agentRunSteps)
                    .values({
                        agentRunId: init.runDbId,
                        stepName: 'synthesize_report',
                        stepOrder: 3 + normalizeTasks(plan).length,
                        status: AGENT_STEP_STATUS.PENDING,
                    })
                    .returning();

                await emit(
                    requestContext,
                    createEvent('stage', {
                        stage: 'research.synthesize',
                        progress: 0.8,
                        message: 'Synthesizing final report',
                    }),
                );
                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(synthesisStep.id),
                        percent: 0,
                        message: 'Starting synthesize_report',
                    }),
                );

                await updateAgentRunStepStatus({ stepDbId: synthesisStep.id, status: AGENT_STEP_STATUS.RUNNING });

                const synthesisPrompt = buildResearchSynthesisPrompt(init.query, plan, findings);
                const report = await generateStructuredOutput(ResearchReportSchema, synthesisPrompt, {
                    modelId: MODELS.DEFAULT,
                    system: 'You are a senior research analyst. Create comprehensive, well-structured reports.',
                    temperature: 0.5,
                });

                await updateAgentRunStepStatus({
                    stepDbId: synthesisStep.id,
                    status: AGENT_STEP_STATUS.COMPLETED,
                    output: report,
                });

                const stockInfo = extractStockInfo(snapshot);
                const [createdReport] = await db
                    .insert(reports)
                    .values({
                        agentRunId: init.runDbId,
                        reportType: 'research',
                        title: report.title,
                        summary: report.executiveSummary,
                        content: report.conclusion,
                        structuredData: report as unknown as Record<string, unknown>,
                        sources: {
                            snapshot: state.snapshotDbId,
                            query: init.query,
                            roles: findings.map((f) => f.role),
                        },
                    })
                    .returning();

                await db.insert(reportSections).values(
                    report.sections.map((section, index) => ({
                        reportId: createdReport.id,
                        sectionName: `section_${index + 1}`,
                        sectionOrder: index + 1,
                        title: section.heading,
                        content: section.content,
                        structuredData: {
                            evidence: section.evidence,
                        } as unknown as Record<string, unknown>,
                    })),
                );

                await updateAgentRunStatus({ runDbId: init.runDbId, status: AGENT_RUN_STATUS.COMPLETED, output: report });

                await emit(
                    requestContext,
                    createEvent('artifact', {
                        stepId: String(synthesisStep.id),
                        artifactType: 'summary',
                        data: {
                            stock: {
                                symbol: stockInfo.symbol,
                                exchange: stockInfo.exchange,
                                name: stockInfo.name ?? null,
                            },
                            title: report.title,
                            executiveSummary: report.executiveSummary,
                        },
                    }),
                );

                await emit(
                    requestContext,
                    createEvent('progress', {
                        stepId: String(synthesisStep.id),
                        percent: 100,
                        message: 'Completed synthesize_report',
                    }),
                );

                const duration = Date.now() - state.startedAtMs;
                await emit(
                    requestContext,
                    createEvent('complete', {
                        result: {
                            runDbId: init.runDbId,
                            reportDbId: createdReport.id,
                            report,
                            plan,
                            findings,
                            snapshotId: state.snapshotDbId,
                            stockSymbol: init.stockSymbol,
                            exchangeAcronym: init.exchangeAcronym,
                            query: init.query,
                        },
                        duration,
                    }),
                );

                await setState({ ...state, report, reportDbId: createdReport.id });

                return {
                    runDbId: init.runDbId,
                    reportDbId: createdReport.id,
                    report,
                    plan,
                    findings,
                };
            },
        }),
    )
    .commit();
