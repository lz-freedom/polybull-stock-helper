import { NextRequest, NextResponse } from 'next/server';
import { RequestContext } from '@mastra/core/request-context';
import { eq } from 'drizzle-orm';

import { createEvent, serializeEvent, type WorkflowEvent } from '@/features/mastra/events/types';
import { WORKFLOW_EVENT_EMITTER_KEY } from '@/features/mastra/workflows/context';
import { mastra } from '@/features/mastra';
import { createPersistedWorkflowEventEmitter } from '@/features/mastra/workflows/persistence';
import { db } from '@/lib/db/drizzle';
import {
    agentRunSteps,
    agentRuns,
    AGENT_RUN_STATUS,
    AGENT_STEP_STATUS,
    AGENT_TYPES,
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

type ConsensusWorkflowRequest = {
    stockSymbol: string;
    exchangeAcronym: string;
    forceRefresh?: boolean;
};

function wantsStream(request: NextRequest): boolean {
    const url = new URL(request.url);
    if (url.searchParams.get('stream') === '1') return true;
    const accept = request.headers.get('accept') ?? '';
    return accept.includes('application/x-ndjson');
}

export async function POST(request: NextRequest) {
    const streaming = wantsStream(request);

    try {
        const user = await getUser();
        const body = (await request.json()) as Partial<ConsensusWorkflowRequest>;

        if (!body.stockSymbol || !body.exchangeAcronym) {
            return NextResponse.json(
                { error: 'stockSymbol and exchangeAcronym are required' },
                { status: 400 },
            );
        }

        const [run] = await db
            .insert(agentRuns)
            .values({
                userId: user?.id,
                agentType: AGENT_TYPES.CONSENSUS,
                status: AGENT_RUN_STATUS.PENDING,
                input: {
                    stockSymbol: body.stockSymbol,
                    exchangeAcronym: body.exchangeAcronym,
                    forceRefresh: body.forceRefresh ?? false,
                    source: 'mastra-workflow',
                } as Record<string, unknown>,
            })
            .returning();

        const [fetchDataStep, parallelAnalysisStep, synthesizeStep] = await db
            .insert(agentRunSteps)
            .values([
                {
                    agentRunId: run.id,
                    stepName: 'fetch_data',
                    stepOrder: 1,
                    status: AGENT_STEP_STATUS.PENDING,
                },
                {
                    agentRunId: run.id,
                    stepName: 'parallel_analysis',
                    stepOrder: 2,
                    status: AGENT_STEP_STATUS.PENDING,
                },
                {
                    agentRunId: run.id,
                    stepName: 'synthesize_consensus',
                    stepOrder: 3,
                    status: AGENT_STEP_STATUS.PENDING,
                },
            ])
            .returning();

        const inputData = {
            runDbId: run.id,
            steps: {
                fetchDataStepDbId: fetchDataStep.id,
                parallelAnalysisStepDbId: parallelAnalysisStep.id,
                synthesizeConsensusStepDbId: synthesizeStep.id,
            },
            stockSymbol: body.stockSymbol,
            exchangeAcronym: body.exchangeAcronym,
            forceRefresh: body.forceRefresh,
        };

        const workflow = mastra.getWorkflow('consensusWorkflow');
        const workflowRun = await workflow.createRun({ runId: `agent-run-${run.id}` });

        if (!streaming) {
            const requestContext = new RequestContext();
            const emit = createPersistedWorkflowEventEmitter({ runDbId: run.id });
            requestContext.set(WORKFLOW_EVENT_EMITTER_KEY, emit);

            try {
                const result = await workflowRun.start({ inputData, requestContext });
                return NextResponse.json(result);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to run workflow';
                await db
                    .update(agentRuns)
                    .set({
                        status: AGENT_RUN_STATUS.FAILED,
                        error: message,
                        updatedAt: new Date(),
                        completedAt: new Date(),
                    })
                    .where(eq(agentRuns.id, run.id));

                await emit(
                    createEvent('error', {
                        message,
                        recoverable: false,
                    }),
                );

                return NextResponse.json({ error: message }, { status: 500 });
            }
        }

        const encoder = new TextEncoder();
        let cancelled = false;

        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                const emit = createPersistedWorkflowEventEmitter({
                    runDbId: run.id,
                    emitter: async (event: WorkflowEvent) => {
                        if (cancelled) return;
                        controller.enqueue(encoder.encode(serializeEvent(event)));
                    },
                });

                const requestContext = new RequestContext();
                requestContext.set(WORKFLOW_EVENT_EMITTER_KEY, emit);

                (async () => {
                    try {
                        await emit(
                            createEvent('stage', {
                                stage: 'consensus.request',
                                progress: 0,
                                message: `Run ${run.id} created`,
                            }),
                        );

                        await workflowRun.start({ inputData, requestContext });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to run workflow';
                        await db
                            .update(agentRuns)
                            .set({
                                status: AGENT_RUN_STATUS.FAILED,
                                error: message,
                                updatedAt: new Date(),
                                completedAt: new Date(),
                            })
                            .where(eq(agentRuns.id, run.id));

                        await emit(
                            createEvent('error', {
                                message,
                                recoverable: false,
                            }),
                        );
                    } finally {
                        controller.close();
                    }
                })();
            },
            async cancel() {
                cancelled = true;
                try {
                    await workflowRun.cancel();
                } finally {
                    await db
                        .update(agentRuns)
                        .set({
                            status: AGENT_RUN_STATUS.CANCELLED,
                            updatedAt: new Date(),
                            completedAt: new Date(),
                        })
                        .where(eq(agentRuns.id, run.id));
                }
            },
        });

        const response = new NextResponse(stream, {
            headers: {
                'content-type': 'application/x-ndjson; charset=utf-8',
                'cache-control': 'no-cache, no-transform',
                connection: 'keep-alive',
                'x-agent-run-id': String(run.id),
            },
        });

        return response;
    } catch (error) {
        console.error('Mastra consensus workflow error:', error);
        if (!streaming) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : 'Failed to process request' },
                { status: 500 },
            );
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(
                    encoder.encode(
                        serializeEvent(
                            createEvent('error', {
                                message: error instanceof Error ? error.message : 'Failed to process request',
                                recoverable: false,
                            }),
                        ),
                    ),
                );
                controller.close();
            },
        });
        return new NextResponse(stream, {
            headers: {
                'content-type': 'application/x-ndjson; charset=utf-8',
                'cache-control': 'no-cache, no-transform',
                connection: 'keep-alive',
            },
            status: 200,
        });
    }
}
