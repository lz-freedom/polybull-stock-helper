import { NextRequest, NextResponse } from 'next/server';
import { RequestContext } from '@mastra/core/request-context';
import { and, eq } from 'drizzle-orm';

import { createEvent, serializeEvent, type WorkflowEvent } from '@/features/mastra/events/types';
import { toDataPart } from '@/features/mastra/events/ai-sdk-adapter';
import { WORKFLOW_EVENT_EMITTER_KEY } from '@/features/mastra/workflows/context';
import { mastra } from '@/features/mastra';
import { createPersistedWorkflowEventEmitter, bumpUsageCounter, insertUsageLog } from '@/features/mastra/workflows/persistence';
import { db } from '@/lib/db/drizzle';
import {
    agentRunSteps,
    agentRuns,
    usageCounters,
    AGENT_RUN_STATUS,
    AGENT_STEP_STATUS,
    AGENT_TYPES,
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

// 支持的 workflow 类型
const SUPPORTED_WORKFLOWS = {
    consensus: {
        workflowId: 'consensusWorkflow',
        agentType: AGENT_TYPES.CONSENSUS,
        steps: ['fetch_data', 'parallel_analysis', 'synthesize_consensus'],
    },
    research: {
        workflowId: 'researchWorkflow',
        agentType: AGENT_TYPES.RESEARCH,
        steps: ['fetch_data', 'create_plan'],
    },
} as const;

type WorkflowType = keyof typeof SUPPORTED_WORKFLOWS;

interface WorkflowRequest {
    workflowType: WorkflowType;
    stockSymbol: string;
    exchangeAcronym: string;
    forceRefresh?: boolean;
    // research workflow 特有
    query?: string;
}

function isValidWorkflowType(type: string): type is WorkflowType {
    return type in SUPPORTED_WORKFLOWS;
}

function wantsStream(request: NextRequest): boolean {
    const url = new URL(request.url);
    if (url.searchParams.get('stream') === '1') return true;
    const accept = request.headers.get('accept') ?? '';
    return accept.includes('application/x-ndjson') || accept.includes('text/event-stream');
}

/**
 * 获取当前 period key (YYYY-MM 格式)
 */
function getCurrentPeriodKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 检查用户使用额度
 */
async function checkUsageQuota(
    userId: number | undefined,
    workflowType: WorkflowType,
): Promise<{ allowed: boolean; limit: number; used: number; periodKey: string }> {
    const periodKey = getCurrentPeriodKey();

    // 默认额度限制
    const WORKFLOW_LIMITS: Record<WorkflowType, number> = {
        consensus: 10, // 共识分析每月10次
        research: 5,   // 深度研究每月5次
    };

    const limit = WORKFLOW_LIMITS[workflowType];

    if (!userId) {
        // 未登录用户不允许使用 workflow
        return { allowed: false, limit, used: 0, periodKey };
    }

    // 查询当前使用次数
    const [counter] = await db
        .select()
        .from(usageCounters)
        .where(
            and(
                eq(usageCounters.userId, userId),
                eq(usageCounters.mode, workflowType),
                eq(usageCounters.periodKey, periodKey),
            ),
        )
        .limit(1);

    const used = counter?.used ?? 0;
    const allowed = used < limit;

    return { allowed, limit, used, periodKey };
}

/**
 * 记录 workflow 使用
 */
async function recordWorkflowUsage(
    userId: number | undefined,
    workflowType: WorkflowType,
    runId: number,
): Promise<void> {
    if (!userId) return;

    const periodKey = getCurrentPeriodKey();
    const WORKFLOW_LIMITS: Record<WorkflowType, number> = {
        consensus: 10,
        research: 5,
    };
    const limit = WORKFLOW_LIMITS[workflowType];

    // 增加计数器
    await bumpUsageCounter({
        userId,
        mode: workflowType,
        periodKey,
        delta: 1,
        limit,
    });

    // 记录使用日志
    await insertUsageLog({
        userId,
        mode: workflowType,
        runId,
        delta: 1,
        reason: `Workflow ${workflowType} started`,
    });
}

/**
 * 创建 workflow 运行记录
 */
async function createWorkflowRun(
    workflowType: WorkflowType,
    userId: number | undefined,
    body: WorkflowRequest,
) {
    const config = SUPPORTED_WORKFLOWS[workflowType];

    const [run] = await db
        .insert(agentRuns)
        .values({
            userId,
            agentType: config.agentType,
            status: AGENT_RUN_STATUS.PENDING,
            input: {
                stockSymbol: body.stockSymbol,
                exchangeAcronym: body.exchangeAcronym,
                query: body.query,
                forceRefresh: body.forceRefresh ?? false,
                source: 'mastra-workflow',
            } as Record<string, unknown>,
        })
        .returning();

    // 创建步骤记录
    const stepValues = config.steps.map((stepName, index) => ({
        agentRunId: run.id,
        stepName,
        stepOrder: index + 1,
        status: AGENT_STEP_STATUS.PENDING,
    }));

    const steps = await db.insert(agentRunSteps).values(stepValues).returning();

    // 构建 inputData
    const inputData: Record<string, unknown> = {
        runDbId: run.id,
        steps: Object.fromEntries(
            steps.map((step, index) => [`${config.steps[index]}StepDbId`, step.id]),
        ),
        stockSymbol: body.stockSymbol,
        exchangeAcronym: body.exchangeAcronym,
        forceRefresh: body.forceRefresh,
    };

    // research workflow 需要 query
    if (workflowType === 'research' && body.query) {
        inputData.query = body.query;
    }

    return { run, steps, inputData };
}

/**
 * 将 NDJSON 流转换为 AI SDK SSE 流
 */
function convertToAISDKStream(
    ndjsonStream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            const reader = ndjsonStream.getReader();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const lines = decoder.decode(value, { stream: true }).split('\n');

                    for (const line of lines) {
                        if (!line.trim()) continue;

                        try {
                            const event = JSON.parse(line) as WorkflowEvent;
                            const dataPart = toDataPart(event);

                            if (dataPart) {
                                // 转换为 SSE 格式
                                const sseData = `data: ${JSON.stringify(dataPart)}\n\n`;
                                controller.enqueue(encoder.encode(sseData));
                            }
                        } catch {
                            // 解析失败，忽略该行
                        }
                    }
                }
            } finally {
                controller.close();
                reader.releaseLock();
            }
        },
    });
}

export async function POST(request: NextRequest) {
    const streaming = wantsStream(request);

    try {
        const user = await getUser();
        const body = (await request.json()) as Partial<WorkflowRequest>;

        // 验证 workflowType
        if (!body.workflowType || !isValidWorkflowType(body.workflowType)) {
            return NextResponse.json(
                { error: 'Invalid or missing workflowType. Must be "consensus" or "research"' },
                { status: 400 },
            );
        }

        // 验证必填字段
        if (!body.stockSymbol || !body.exchangeAcronym) {
            return NextResponse.json(
                { error: 'stockSymbol and exchangeAcronym are required' },
                { status: 400 },
            );
        }

        // research workflow 需要 query
        if (body.workflowType === 'research' && !body.query) {
            return NextResponse.json(
                { error: 'query is required for research workflow' },
                { status: 400 },
            );
        }

        const workflowType = body.workflowType;
        const config = SUPPORTED_WORKFLOWS[workflowType];

        // 检查次数配额
        const quota = await checkUsageQuota(user?.id, workflowType);
        if (!quota.allowed) {
            return NextResponse.json(
                {
                    error: 'Usage quota exceeded',
                    details: {
                        mode: workflowType,
                        limit: quota.limit,
                        used: quota.used,
                        period: quota.periodKey,
                    },
                },
                { status: 403 },
            );
        }

        // 创建运行记录
        const { run, inputData } = await createWorkflowRun(workflowType, user?.id, body as WorkflowRequest);

        // 记录使用（启动成功即扣费）
        await recordWorkflowUsage(user?.id, workflowType, run.id);

        // 获取 workflow
        const workflow = mastra.getWorkflow(config.workflowId);
        const workflowRun = await workflow.createRun({ runId: `agent-run-${run.id}` });

        // 非流式模式
        if (!streaming) {
            const requestContext = new RequestContext();
            const emit = createPersistedWorkflowEventEmitter({ runDbId: run.id });
            requestContext.set(WORKFLOW_EVENT_EMITTER_KEY, emit);

            try {
                const result = await workflowRun.start({ inputData, requestContext });
                return NextResponse.json({
                    success: true,
                    runId: run.id,
                    result,
                });
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

        // 流式模式
        const encoder = new TextEncoder();
        let cancelled = false;

        const ndjsonStream = new ReadableStream<Uint8Array>({
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
                                stage: `${workflowType}.request`,
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

        // 转换为 AI SDK SSE 流
        const aiSdkStream = convertToAISDKStream(ndjsonStream);

        return new NextResponse(aiSdkStream, {
            headers: {
                'content-type': 'text/event-stream; charset=utf-8',
                'cache-control': 'no-cache, no-transform',
                connection: 'keep-alive',
                'x-agent-run-id': String(run.id),
            },
        });
    } catch (error) {
        console.error('Mastra workflow error:', error);
        const message = error instanceof Error ? error.message : 'Failed to process request';

        if (!streaming) {
            return NextResponse.json({ error: message }, { status: 500 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                const errorPart = {
                    type: 'error',
                    error: message,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPart)}\n\n`));
                controller.close();
            },
        });

        return new NextResponse(stream, {
            headers: {
                'content-type': 'text/event-stream; charset=utf-8',
                'cache-control': 'no-cache, no-transform',
                connection: 'keep-alive',
            },
            status: 200,
        });
    }
}

/**
 * GET 请求用于查询 workflow 状态或结果
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const runId = searchParams.get('runId');

        if (!runId) {
            return NextResponse.json({ error: 'runId is required' }, { status: 400 });
        }

        const runIdNum = parseInt(runId, 10);
        if (isNaN(runIdNum)) {
            return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
        }

        const [run] = await db
            .select()
            .from(agentRuns)
            .where(eq(agentRuns.id, runIdNum))
            .limit(1);

        if (!run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            run: {
                id: run.id,
                status: run.status,
                agentType: run.agentType,
                createdAt: run.createdAt,
                updatedAt: run.updatedAt,
                completedAt: run.completedAt,
                error: run.error,
            },
        });
    } catch (error) {
        console.error('Workflow GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch run' },
            { status: 500 },
        );
    }
}
