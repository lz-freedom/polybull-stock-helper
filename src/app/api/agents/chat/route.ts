import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai';
import { handleChatStream, type ChatStreamHandlerParams } from '@mastra/ai-sdk';
import { RequestContext } from '@mastra/core/request-context';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { extractStockInfoFromText } from '@/features/agents/actions/extract';
import {
    CHAT_MODES,
    DEFAULT_CHAT_MODE,
    type ChatMode,
} from '@/features/agents/lib/chat-contract';
import {
    archiveSession,
    createChatSession,
    getChatSession,
    getUserSessions,
    refreshSessionData,
    updateSessionStock,
    updateSessionTitle,
} from '@/features/agents/lib/graphs/qa';
import { mastra } from '@/features/mastra';
import { createEvent, type WorkflowEvent } from '@/features/mastra/events/types';
import { WORKFLOW_EVENT_EMITTER_KEY } from '@/features/mastra/workflows/context';
import {
    bumpUsageCounter,
    createPersistedWorkflowEventEmitter,
    insertUsageLog,
} from '@/features/mastra/workflows/persistence';
import { db } from '@/lib/db/drizzle';
import {
    agentRunSteps,
    agentRuns,
    chatMessages,
    chatSessions,
    usageCounters,
    AGENT_RUN_STATUS,
    AGENT_STEP_STATUS,
    AGENT_TYPES,
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

type MinimalToolCallMetadata = {
    toolCallId: string;
    toolName: string;
    status: 'called' | 'completed' | 'error';
};

type MastraChatParams = ChatStreamHandlerParams<UIMessage> & {
    id?: string;
    session_id?: string;
    sessionId?: string;
    stockSymbol?: string;
    exchangeAcronym?: string;
    forceRefresh?: boolean;
};

type ToolInputStreamState = {
    toolName?: string;
    argsText: string;
    providerExecuted?: boolean;
    providerMetadata?: unknown;
    dynamic?: boolean;
    title?: string;
};

function normalizeToolInputStream(
    stream: ReadableStream<Record<string, unknown>>,
): ReadableStream<Record<string, unknown>> {
    const toolInputState = new Map<string, ToolInputStreamState>();

    const getToolCallId = (chunk: Record<string, unknown>) => {
        const raw = chunk.toolCallId ?? chunk.id;
        return typeof raw === 'string' ? raw : null;
    };

    const transformer = new TransformStream<Record<string, unknown>, Record<string, unknown>>({
        transform(chunk, controller) {
            if (!chunk || typeof chunk !== 'object') {
                controller.enqueue(chunk);
                return;
            }

            const type = chunk.type;

            if (type === 'tool-input-start') {
                const toolCallId = getToolCallId(chunk);
                if (!toolCallId) {
                    controller.enqueue(chunk);
                    return;
                }
                toolInputState.set(toolCallId, {
                    toolName: typeof chunk.toolName === 'string' ? chunk.toolName : undefined,
                    argsText: '',
                    providerExecuted:
                        typeof chunk.providerExecuted === 'boolean' ? chunk.providerExecuted : undefined,
                    providerMetadata: chunk.providerMetadata,
                    dynamic: typeof chunk.dynamic === 'boolean' ? chunk.dynamic : undefined,
                    title: typeof chunk.title === 'string' ? chunk.title : undefined,
                });
                return;
            }

            if (type === 'tool-input-delta') {
                const toolCallId = getToolCallId(chunk);
                if (!toolCallId) {
                    controller.enqueue(chunk);
                    return;
                }
                const delta =
                    typeof chunk.inputTextDelta === 'string'
                        ? chunk.inputTextDelta
                        : typeof chunk.delta === 'string'
                          ? chunk.delta
                          : '';
                if (!delta) return;
                const current = toolInputState.get(toolCallId) ?? {
                    argsText: '',
                };
                toolInputState.set(toolCallId, {
                    ...current,
                    argsText: `${current.argsText}${delta}`,
                });
                return;
            }

            if (type === 'tool-input-end') {
                const toolCallId = getToolCallId(chunk);
                if (!toolCallId) {
                    controller.enqueue(chunk);
                    return;
                }
                const state = toolInputState.get(toolCallId);
                if (!state) return;

                let parsedInput: unknown = state.argsText;
                if (state.argsText) {
                    try {
                        parsedInput = JSON.parse(state.argsText);
                    } catch {
                        parsedInput = state.argsText;
                    }
                } else {
                    parsedInput = {};
                }

                controller.enqueue({
                    type: 'tool-input-available',
                    toolCallId,
                    toolName: state.toolName ?? 'tool',
                    input: parsedInput,
                    ...(state.providerExecuted !== undefined
                        ? { providerExecuted: state.providerExecuted }
                        : {}),
                    ...(state.providerMetadata !== undefined
                        ? { providerMetadata: state.providerMetadata }
                        : {}),
                    ...(state.dynamic !== undefined ? { dynamic: state.dynamic } : {}),
                    ...(state.title ? { title: state.title } : {}),
                });

                toolInputState.delete(toolCallId);
                return;
            }

            if (type === 'tool-input-available' || type === 'tool-input-error') {
                const toolCallId = getToolCallId(chunk);
                if (toolCallId) toolInputState.delete(toolCallId);
            }

            controller.enqueue(chunk);
        },
    });

    return stream.pipeThrough(transformer);
}

function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
}

function getMessageText(message: unknown): string {
    if (!message || typeof message !== 'object') return '';

    const maybeContent = (message as { content?: unknown }).content;
    if (typeof maybeContent === 'string') return maybeContent;
    if (Array.isArray(maybeContent)) {
        return maybeContent
            .filter(
                (part): part is { type: 'text'; text: string } =>
                    !!part &&
                    typeof part === 'object' &&
                    (part as { type?: unknown }).type === 'text' &&
                    typeof (part as { text?: unknown }).text === 'string',
            )
            .map((part) => part.text)
            .join('');
    }

    const maybeParts = (message as { parts?: unknown }).parts;
    if (!Array.isArray(maybeParts)) return '';

    return maybeParts
        .filter(
            (part): part is { type: 'text'; text: string } =>
                !!part &&
                typeof part === 'object' &&
                (part as { type?: unknown }).type === 'text' &&
                typeof (part as { text?: unknown }).text === 'string',
        )
        .map((part) => part.text)
        .join('');
}

type AgentChatMessage = {
    id?: string;
    role: UIMessage['role'];
    content: string;
};

function sanitizeMessagesForModel(messages: UIMessage[]): AgentChatMessage[] {
    return messages
        .map((message) => {
            const text = getMessageText(message);
            if (!text.trim()) return null;
            return {
                id: message.id,
                role: message.role,
                content: text,
            } satisfies AgentChatMessage;
        })
        .filter((message): message is AgentChatMessage => Boolean(message));
}

const GREETING_PATTERN = /^(hi|hello|hey|yo|你好|您好|哈喽|嗨|早上好|下午好|晚上好|在吗|在嘛|hey there)[!！。]?$/i;
const INSTANT_TOOL_TRIGGER =
    /(股价|价格|现价|最新价|当前价|市值|市盈率|PE|P\/E|EPS|营收|利润|现金流|估值|财报|业绩|回报率|收益率|涨跌|涨幅|跌幅|日线|K线|成交量|分红)/i;

function isGreeting(text: string): boolean {
    return GREETING_PATTERN.test(text.trim());
}

function shouldEnableInstantTools(text: string): boolean {
    return INSTANT_TOOL_TRIGGER.test(text);
}

function resolveChatMode(raw: unknown): ChatMode {
    if (typeof raw !== 'string') return DEFAULT_CHAT_MODE;
    return Object.values(CHAT_MODES).includes(raw as ChatMode)
        ? (raw as ChatMode)
        : DEFAULT_CHAT_MODE;
}

function resolveModeSystemContext(mode: ChatMode): string | null {
    if (mode === CHAT_MODES.INSTANT) {
        return [
            'Mode: Instant (fast answer).',
            'Tool strategy: avoid tool calls by default.',
            'Response style: keep it to 1-2 sentences, no headings or long lists.',
            'Only call getStockSnapshot if the user explicitly asks for real-time numbers or you cannot answer without fresh data.',
        ].join(' ');
    }
    if (mode === CHAT_MODES.RIGOROUS) {
        return [
            'Mode: Rigorous.',
            'Tool strategy: use getStockSnapshot when a stock is mentioned and the answer depends on current data.',
            'Use search tools when external context or sources are required.',
        ].join(' ');
    }
    return null;
}

async function resolveStockContext(sessionId: string, content: string) {
    if (isGreeting(content)) return {};

    const session = await getChatSession(sessionId);
    if (session?.stock_symbol) {
        return {
            stockSymbol: session.stock_symbol,
            exchangeAcronym: session.exchange_acronym ?? undefined,
            context: [
                {
                    role: 'system' as const,
                    content: `Detected stock for this thread: ${session.stock_symbol}${
                        session.exchange_acronym ? ` (${session.exchange_acronym})` : ''
                    }. If you need current data, call getStockSnapshot first, then provide a concise answer referencing the data.`,
                },
            ],
        };
    }

    const extracted = await extractStockInfoFromText(content);
    if (!extracted?.symbol) return {};

    const exchange = extracted.exchange ?? undefined;
    await updateSessionStock(sessionId, extracted.symbol, exchange);

    return {
        stockSymbol: extracted.symbol,
        exchangeAcronym: exchange,
        context: [
            {
                role: 'system' as const,
                content: `Detected stock from user input: ${extracted.symbol}${
                    exchange ? ` (${exchange})` : ''
                }. If you need current data, call getStockSnapshot first, then provide a concise answer referencing the data.`,
            },
        ],
    };
}

const DEFAULT_MODE_LIMITS: Record<ChatMode, number> = {
    [CHAT_MODES.INSTANT]: 200,
    [CHAT_MODES.RIGOROUS]: 60,
    [CHAT_MODES.CONSENSUS]: 10,
    [CHAT_MODES.RESEARCH]: 5,
};

const DEFAULT_MODE_MAX_STEPS: Record<ChatMode, number> = {
    [CHAT_MODES.INSTANT]: 4,
    [CHAT_MODES.RIGOROUS]: 8,
    [CHAT_MODES.CONSENSUS]: 6,
    [CHAT_MODES.RESEARCH]: 6,
};

function resolveModeLimit(mode: ChatMode): number {
    const envKey =
        mode === CHAT_MODES.INSTANT
            ? 'CHAT_QUOTA_INSTANT'
            : mode === CHAT_MODES.RIGOROUS
              ? 'CHAT_QUOTA_RIGOROUS'
              : mode === CHAT_MODES.CONSENSUS
                ? 'CHAT_QUOTA_CONSENSUS'
                : 'CHAT_QUOTA_RESEARCH';

    const raw = process.env[envKey];
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return DEFAULT_MODE_LIMITS[mode];
}

function getUsagePeriodKey(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

async function checkUsageQuota(params: {
    userId?: number | null;
    mode: ChatMode;
}) {
    if (!params.userId) {
        return {
            allowed: true,
            limit: null,
            used: null,
            remaining: null,
            periodKey: null,
            shouldTrack: false,
        };
    }

    const limit = resolveModeLimit(params.mode);
    const periodKey = getUsagePeriodKey();

    const [counter] = await db
        .select({
            used: usageCounters.used,
            limit: usageCounters.limit,
        })
        .from(usageCounters)
        .where(
            and(
                eq(usageCounters.userId, params.userId),
                eq(usageCounters.mode, params.mode),
                eq(usageCounters.periodKey, periodKey),
            ),
        )
        .limit(1);

    const used = counter?.used ?? 0;
    const remaining = Math.max(limit - used, 0);

    return {
        allowed: remaining > 0,
        limit,
        used,
        remaining,
        periodKey,
        shouldTrack: true,
    };
}

async function reserveUsage(params: {
    userId?: number | null;
    mode: ChatMode;
    periodKey: string;
    limit: number;
    sessionId?: string | null;
    runId?: number | null;
    reason?: string;
}) {
    await bumpUsageCounter({
        userId: params.userId,
        mode: params.mode,
        periodKey: params.periodKey,
        delta: 1,
        limit: params.limit,
    });

    await insertUsageLog({
        userId: params.userId,
        mode: params.mode,
        runId: params.runId ?? null,
        sessionId: params.sessionId ?? null,
        delta: 1,
        reason: params.reason ?? 'reserve',
    });
}

async function rollbackUsage(params: {
    userId?: number | null;
    mode: ChatMode;
    periodKey: string;
    limit: number;
    sessionId?: string | null;
    runId?: number | null;
    reason?: string;
}) {
    await bumpUsageCounter({
        userId: params.userId,
        mode: params.mode,
        periodKey: params.periodKey,
        delta: -1,
        limit: params.limit,
    });

    await insertUsageLog({
        userId: params.userId,
        mode: params.mode,
        runId: params.runId ?? null,
        sessionId: params.sessionId ?? null,
        delta: -1,
        reason: params.reason ?? 'rollback',
    });
}

async function createConsensusRunRecords(params: {
    userId?: number | null;
    stockSymbol: string;
    exchangeAcronym: string;
    forceRefresh?: boolean;
    sessionId: string;
    query: string;
}) {
    const [run] = await db
        .insert(agentRuns)
        .values({
            userId: params.userId,
            agentType: AGENT_TYPES.CONSENSUS,
            status: AGENT_RUN_STATUS.PENDING,
            input: {
                stockSymbol: params.stockSymbol,
                exchangeAcronym: params.exchangeAcronym,
                forceRefresh: params.forceRefresh ?? false,
                query: params.query,
                sessionId: params.sessionId,
                source: 'agents-chat',
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

    return {
        run,
        steps: {
            fetchDataStep,
            parallelAnalysisStep,
            synthesizeStep,
        },
        inputData: {
            runDbId: run.id,
            steps: {
                fetchDataStepDbId: fetchDataStep.id,
                parallelAnalysisStepDbId: parallelAnalysisStep.id,
                synthesizeConsensusStepDbId: synthesizeStep.id,
            },
            stockSymbol: params.stockSymbol,
            exchangeAcronym: params.exchangeAcronym,
            forceRefresh: params.forceRefresh,
        },
    };
}

async function createResearchRunRecords(params: {
    userId?: number | null;
    stockSymbol: string;
    exchangeAcronym: string;
    query: string;
    forceRefresh?: boolean;
    sessionId: string;
}) {
    const [run] = await db
        .insert(agentRuns)
        .values({
            userId: params.userId,
            agentType: AGENT_TYPES.RESEARCH,
            status: AGENT_RUN_STATUS.PENDING,
            input: {
                stockSymbol: params.stockSymbol,
                exchangeAcronym: params.exchangeAcronym,
                query: params.query,
                forceRefresh: params.forceRefresh ?? false,
                sessionId: params.sessionId,
                source: 'agents-chat',
            } as Record<string, unknown>,
        })
        .returning();

    const [fetchDataStep, createPlanStep] = await db
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
                stepName: 'create_plan',
                stepOrder: 2,
                status: AGENT_STEP_STATUS.PENDING,
            },
        ])
        .returning();

    return {
        run,
        steps: {
            fetchDataStep,
            createPlanStep,
        },
        inputData: {
            runDbId: run.id,
            steps: {
                fetchDataStepDbId: fetchDataStep.id,
                createPlanStepDbId: createPlanStep.id,
            },
            stockSymbol: params.stockSymbol,
            exchangeAcronym: params.exchangeAcronym,
            query: params.query,
            forceRefresh: params.forceRefresh,
        },
    };
}

export async function POST(request: NextRequest) {
    try {
        const user = await getUser();
        const body = await request.json();
        const mode = resolveChatMode(body?.mode);

        // Check for standard Vercel AI SDK Chat request (has messages and no explicit 'action' for chat)
        if (Array.isArray(body.messages) && !body.action) {
            const params = body as MastraChatParams;
            const sessionId = params.session_id ?? params.sessionId;
            const chatId = params.id;

            if (!Array.isArray(params.messages) || params.messages.length === 0) {
                return NextResponse.json(
                    { error: 'messages are required for chat' },
                    { status: 400 },
                );
            }

            const [existingSession] = sessionId
                ? await db
                      .select()
                      .from(chatSessions)
                      .where(eq(chatSessions.id, sessionId))
                : chatId
                  ? await db
                        .select()
                        .from(chatSessions)
                        .where(
                            and(
                                sql`${chatSessions.metadata} ->> 'mastraChatId' = ${chatId}`,
                                user?.id
                                    ? or(eq(chatSessions.userId, user.id), isNull(chatSessions.userId))
                                    : isNull(chatSessions.userId),
                            ),
                        )
                  : [];

            const session =
                existingSession ??
                (
                    await db
                        .insert(chatSessions)
                        .values({
                            ...(sessionId ? { id: sessionId } : {}),
                            userId: user?.id,
                            stock_symbol: params.stockSymbol ?? null,
                            exchange_acronym: params.exchangeAcronym ?? null,
                            title: `Chat ${new Date().toLocaleDateString()}`,
                            metadata: {
                                source: 'agents',
                                agentId: 'qaAgent',
                                mode,
                                ...(chatId ? { mastraChatId: chatId } : {}),
                            },
                        })
                        .returning()
                )[0];

            if (user?.id && !session.userId) {
                await db
                    .update(chatSessions)
                    .set({ userId: user.id })
                    .where(eq(chatSessions.id, session.id));
            }

            const lastUserMessage = [...params.messages]
                .reverse()
                .find((message) => message?.role === 'user') as
                | { id?: string; role?: string }
                | undefined;
            const lastUserMessageId =
                lastUserMessage?.role === 'user' && typeof lastUserMessage.id === 'string'
                    ? lastUserMessage.id
                    : undefined;

            if (lastUserMessage?.role === 'user') {
                const content = getMessageText(lastUserMessage);
                if (!content.trim()) {
                    return NextResponse.json(
                        { error: 'Last user message has no content' },
                        { status: 400 },
                    );
                }

                const stockContext = await resolveStockContext(session.id, content);
                const modeContext = resolveModeSystemContext(mode);
                const instantToolChoice =
                    mode === CHAT_MODES.INSTANT && !shouldEnableInstantTools(content)
                        ? 'none'
                        : undefined;
                const reportContext =
                    typeof body?.reportContext === 'string' && body.reportContext.trim().length > 0
                        ? body.reportContext.trim()
                        : undefined;
                const quota = await checkUsageQuota({ userId: user?.id, mode });

                if (!quota.allowed) {
                    return NextResponse.json(
                        {
                            error: 'Quota exceeded for this mode',
                            mode,
                            limit: quota.limit,
                            used: quota.used,
                            remaining: quota.remaining,
                            periodKey: quota.periodKey,
                        },
                        { status: 429 },
                    );
                }

                const [alreadyPersisted] = lastUserMessageId
                    ? await db
                          .select({ id: chatMessages.id })
                          .from(chatMessages)
                          .where(
                              and(
                                  eq(chatMessages.sessionId, session.id),
                                  sql`${chatMessages.metadata} ->> 'clientMessageId' = ${lastUserMessageId}`,
                              ),
                          )
                          .limit(1)
                    : [];

                if (!alreadyPersisted) {
                    await db.insert(chatMessages).values({
                        sessionId: session.id,
                        role: 'user',
                        content,
                        metadata: {
                            source: 'agents',
                            mode,
                            ...(chatId ? { mastraChatId: chatId } : {}),
                            ...(lastUserMessageId ? { clientMessageId: lastUserMessageId } : {}),
                        },
                    });
                }

                const quotaSnapshot = quota.shouldTrack
                    ? {
                          userId: user?.id ?? null,
                          mode,
                          periodKey: quota.periodKey!,
                          limit: quota.limit!,
                          sessionId: session.id,
                      }
                    : null;

                if (mode === CHAT_MODES.CONSENSUS) {
                    const resolvedStockSymbol = stockContext.stockSymbol ?? params.stockSymbol;
                    const resolvedExchangeAcronym =
                        stockContext.exchangeAcronym ?? params.exchangeAcronym;

                    if (!resolvedStockSymbol || !resolvedExchangeAcronym) {
                        return NextResponse.json(
                            {
                                error:
                                    'stockSymbol and exchangeAcronym are required for consensus mode',
                            },
                            { status: 400 },
                        );
                    }

                    if (!stockContext.stockSymbol && params.stockSymbol) {
                        await updateSessionStock(
                            session.id,
                            resolvedStockSymbol,
                            resolvedExchangeAcronym,
                        );
                    }

                    const { run, inputData } = await createConsensusRunRecords({
                        userId: user?.id ?? null,
                        stockSymbol: resolvedStockSymbol,
                        exchangeAcronym: resolvedExchangeAcronym,
                        forceRefresh:
                            typeof params.forceRefresh === 'boolean'
                                ? params.forceRefresh
                                : undefined,
                        sessionId: session.id,
                        query: content,
                    });

                    if (quotaSnapshot) {
                        await reserveUsage({
                            ...quotaSnapshot,
                            runId: run.id,
                            reason: 'consensus',
                        });
                    }

                    const [assistantMessage] = await db
                        .insert(chatMessages)
                        .values({
                            sessionId: session.id,
                            role: 'assistant',
                            content: '',
                            metadata: {
                                source: 'agents',
                                mode,
                                agentRunId: run.id,
                                ...(chatId ? { mastraChatId: chatId } : {}),
                                ...(lastUserMessageId
                                    ? { repliedToClientMessageId: lastUserMessageId }
                                    : {}),
                            },
                        })
                        .returning();

                    let assistantText = '';
                    let finalStatus: 'finished' | 'failed' = 'finished';
                    let errorText: string | undefined;

                    const finalize = async () => {
                        await db
                            .update(chatMessages)
                            .set({
                                content: assistantText,
                                metadata: {
                                    source: 'agents',
                                    mode,
                                    status: finalStatus,
                                    agentRunId: run.id,
                                    ...(errorText
                                        ? { error: truncate(errorText, 2000) }
                                        : {}),
                                    ...(chatId ? { mastraChatId: chatId } : {}),
                                    ...(lastUserMessageId
                                        ? { repliedToClientMessageId: lastUserMessageId }
                                        : {}),
                                },
                            })
                            .where(eq(chatMessages.id, assistantMessage.id));

                        await db
                            .update(chatSessions)
                            .set({ updatedAt: new Date() })
                            .where(eq(chatSessions.id, session.id));
                    };

                    const stream = createUIMessageStream({
                        execute: async ({ writer }) => {
                            let planRoundEmitted = false;
                            const emitToWriter = async (event: WorkflowEvent) => {
                                try {
                                    writer.write({
                                        type: `data-${event.type}`,
                                        data: event,
                                    });

                                    if (event.type === 'artifact' && !planRoundEmitted) {
                                        const artifactData = event.data as
                                            | { tasks?: unknown[] }
                                            | undefined;
                                        if (artifactData?.tasks && Array.isArray(artifactData.tasks)) {
                                            writer.write({
                                                type: 'data-round',
                                                data: {
                                                    round: 0,
                                                    totalRounds: artifactData.tasks.length,
                                                    speaker: 'planner',
                                                    agenda: 'Research plan created',
                                                    timestamp: Date.now(),
                                                },
                                            });
                                            planRoundEmitted = true;
                                        }
                                    }
                                } catch (err) {
                                    console.warn(
                                        'Failed to write workflow event to stream:',
                                        err,
                                    );
                                }
                            };

                            const emit = createPersistedWorkflowEventEmitter({
                                runDbId: run.id,
                                emitter: emitToWriter,
                            });

                            const requestContext = new RequestContext();
                            requestContext.set(WORKFLOW_EVENT_EMITTER_KEY, emit);

                            const workflow = mastra.getWorkflow('consensusWorkflow');
                            const workflowRun = await workflow.createRun({
                                runId: `agent-run-${run.id}`,
                            });

                            try {
                                await emit(
                                    createEvent('stage', {
                                        stage: 'consensus.request',
                                        progress: 0,
                                        message: `Run ${run.id} created`,
                                    }),
                                );

                                const result = await workflowRun.start({
                                    inputData,
                                    requestContext,
                                });

                                if (result?.report) {
                                    assistantText =
                                        result.report.overallSummary ??
                                        result.report.title ??
                                        assistantText;

                                    try {
                                        writer.write({
                                            type: 'data-report',
                                            data: {
                                                runId: run.id,
                                                reportId: result.reportDbId,
                                                reportType: 'consensus',
                                                report: result.report,
                                                timestamp: Date.now(),
                                            },
                                        });
                                    } catch (err) {
                                        console.warn(
                                            'Failed to write report to stream:',
                                            err,
                                        );
                                    }
                                }
                            } catch (err) {
                                finalStatus = 'failed';
                                errorText =
                                    err instanceof Error ? err.message : String(err);

                                await db
                                    .update(agentRuns)
                                    .set({
                                        status: AGENT_RUN_STATUS.FAILED,
                                        error: errorText,
                                        updatedAt: new Date(),
                                        completedAt: new Date(),
                                    })
                                    .where(eq(agentRuns.id, run.id));

                                if (quotaSnapshot) {
                                    await rollbackUsage({
                                        ...quotaSnapshot,
                                        runId: run.id,
                                        reason: 'consensus_failed',
                                    });
                                }

                                await emit(
                                    createEvent('error', {
                                        message: errorText,
                                        recoverable: false,
                                    }),
                                );
                            } finally {
                                await finalize();
                            }
                        },
                    });

                    const response = createUIMessageStreamResponse({
                        stream,
                        headers: {
                            'cache-control': 'no-cache, no-transform',
                            'x-agent-run-id': String(run.id),
                            'x-chat-session-id': String(session.id),
                        },
                    });

                    return response;
                }

                if (mode === CHAT_MODES.RESEARCH) {
                    const resolvedStockSymbol = stockContext.stockSymbol ?? params.stockSymbol;
                    const resolvedExchangeAcronym =
                        stockContext.exchangeAcronym ?? params.exchangeAcronym;

                    if (!resolvedStockSymbol || !resolvedExchangeAcronym) {
                        return NextResponse.json(
                            {
                                error:
                                    'stockSymbol and exchangeAcronym are required for research mode',
                            },
                            { status: 400 },
                        );
                    }

                    if (!stockContext.stockSymbol && params.stockSymbol) {
                        await updateSessionStock(
                            session.id,
                            resolvedStockSymbol,
                            resolvedExchangeAcronym,
                        );
                    }

                    const { run, inputData } = await createResearchRunRecords({
                        userId: user?.id ?? null,
                        stockSymbol: resolvedStockSymbol,
                        exchangeAcronym: resolvedExchangeAcronym,
                        query: content,
                        forceRefresh:
                            typeof params.forceRefresh === 'boolean'
                                ? params.forceRefresh
                                : undefined,
                        sessionId: session.id,
                    });

                    if (quotaSnapshot) {
                        await reserveUsage({
                            ...quotaSnapshot,
                            runId: run.id,
                            reason: 'research',
                        });
                    }

                    const [assistantMessage] = await db
                        .insert(chatMessages)
                        .values({
                            sessionId: session.id,
                            role: 'assistant',
                            content: '',
                            metadata: {
                                source: 'agents',
                                mode,
                                agentRunId: run.id,
                                ...(chatId ? { mastraChatId: chatId } : {}),
                                ...(lastUserMessageId
                                    ? { repliedToClientMessageId: lastUserMessageId }
                                    : {}),
                            },
                        })
                        .returning();

                    let assistantText = '';
                    let finalStatus: 'finished' | 'failed' = 'finished';
                    let errorText: string | undefined;

                    const finalize = async () => {
                        await db
                            .update(chatMessages)
                            .set({
                                content: assistantText,
                                metadata: {
                                    source: 'agents',
                                    mode,
                                    status: finalStatus,
                                    agentRunId: run.id,
                                    ...(errorText
                                        ? { error: truncate(errorText, 2000) }
                                        : {}),
                                    ...(chatId ? { mastraChatId: chatId } : {}),
                                    ...(lastUserMessageId
                                        ? { repliedToClientMessageId: lastUserMessageId }
                                        : {}),
                                },
                            })
                            .where(eq(chatMessages.id, assistantMessage.id));

                        await db
                            .update(chatSessions)
                            .set({ updatedAt: new Date() })
                            .where(eq(chatSessions.id, session.id));
                    };

                    const stream = createUIMessageStream({
                        execute: async ({ writer }) => {
                            const emitToWriter = async (event: WorkflowEvent) => {
                                try {
                                    writer.write({
                                        type: `data-${event.type}`,
                                        data: event,
                                    });
                                } catch (err) {
                                    console.warn(
                                        'Failed to write workflow event to stream:',
                                        err,
                                    );
                                }
                            };

                            const emit = createPersistedWorkflowEventEmitter({
                                runDbId: run.id,
                                emitter: emitToWriter,
                            });

                            const requestContext = new RequestContext();
                            requestContext.set(WORKFLOW_EVENT_EMITTER_KEY, emit);

                            const workflow = mastra.getWorkflow('researchWorkflow');
                            const workflowRun = await workflow.createRun({
                                runId: `agent-run-${run.id}`,
                            });

                            try {
                                await emit(
                                    createEvent('stage', {
                                        stage: 'research.request',
                                        progress: 0,
                                        message: `Run ${run.id} created`,
                                    }),
                                );

                                const result = await workflowRun.start({
                                    inputData,
                                    requestContext,
                                });

                                if (result?.report) {
                                    assistantText =
                                        result.report.executiveSummary ??
                                        result.report.title ??
                                        assistantText;

                                    try {
                                        writer.write({
                                            type: 'data-step-summary',
                                            data: {
                                                stepId: 'research.report',
                                                summary:
                                                    result.report.executiveSummary ??
                                                    result.report.title,
                                                timestamp: Date.now(),
                                            },
                                        });
                                    } catch (err) {
                                        console.warn(
                                            'Failed to write step summary to stream:',
                                            err,
                                        );
                                    }

                                    try {
                                        writer.write({
                                            type: 'data-report',
                                            data: {
                                                runId: run.id,
                                                reportId: result.reportDbId,
                                                reportType: 'research',
                                                report: result.report,
                                                timestamp: Date.now(),
                                            },
                                        });
                                    } catch (err) {
                                        console.warn(
                                            'Failed to write report to stream:',
                                            err,
                                        );
                                    }
                                }
                            } catch (err) {
                                finalStatus = 'failed';
                                errorText =
                                    err instanceof Error ? err.message : String(err);

                                await db
                                    .update(agentRuns)
                                    .set({
                                        status: AGENT_RUN_STATUS.FAILED,
                                        error: errorText,
                                        updatedAt: new Date(),
                                        completedAt: new Date(),
                                    })
                                    .where(eq(agentRuns.id, run.id));

                                if (quotaSnapshot) {
                                    await rollbackUsage({
                                        ...quotaSnapshot,
                                        runId: run.id,
                                        reason: 'research_failed',
                                    });
                                }

                                await emit(
                                    createEvent('error', {
                                        message: errorText,
                                        recoverable: false,
                                    }),
                                );
                            } finally {
                                await finalize();
                            }
                        },
                    });

                    const response = createUIMessageStreamResponse({
                        stream,
                        headers: {
                            'cache-control': 'no-cache, no-transform',
                            'x-agent-run-id': String(run.id),
                            'x-chat-session-id': String(session.id),
                        },
                    });

                    return response;
                }

                const [assistantMessage] = await db
                    .insert(chatMessages)
                    .values({
                        sessionId: session.id,
                        role: 'assistant',
                        content: '',
                        metadata: {
                            source: 'agents',
                            mode,
                            ...(chatId ? { mastraChatId: chatId } : {}),
                            ...(lastUserMessageId
                                ? { repliedToClientMessageId: lastUserMessageId }
                                : {}),
                        },
                    })
                    .returning();

                if (quotaSnapshot) {
                    await reserveUsage({
                        ...quotaSnapshot,
                        reason: 'qa',
                    });
                }

                const combinedContext = [
                    ...(modeContext
                        ? [
                              {
                                  role: 'system' as const,
                                  content: modeContext,
                              },
                          ]
                        : []),
                    ...(stockContext.context ?? []),
                    ...(reportContext
                        ? [
                              {
                                  role: 'system' as const,
                                  content: `Follow-up context summary:\n${reportContext}`,
                              },
                          ]
                        : []),
                ];

                const stream = await handleChatStream({
                    mastra,
                    agentId: 'qaAgent',
                    params: {
                        ...params,
                        messages: sanitizeMessagesForModel(params.messages) as unknown as UIMessage[],
                    },
                    defaultOptions: {
                        memory: {
                            thread: { id: session.id },
                            resource: user?.id ? String(user.id) : session.id,
                        },
                        maxSteps: DEFAULT_MODE_MAX_STEPS[mode] ?? 4,
                        ...(combinedContext.length > 0 ? { context: combinedContext } : {}),
                        ...(instantToolChoice ? { toolChoice: instantToolChoice } : {}),
                        providerOptions: {
                            openai: {
                                store: false,
                            },
                        },
                    },
                });

                let assistantText = '';
                const toolCallsById = new Map<string, MinimalToolCallMetadata>();
                let sawErrorText: string | undefined;
                let sawAbort = false;
                let finalized = false;

                const finalize = async (status: 'finished' | 'cancelled' | 'failed') => {
                    if (finalized) return;
                    finalized = true;

                    if (quotaSnapshot && status !== 'finished') {
                        await rollbackUsage({
                            ...quotaSnapshot,
                            reason: status === 'cancelled' ? 'qa_cancelled' : 'qa_failed',
                        });
                    }

                    const toolCalls = Array.from(toolCallsById.values());

                    await db
                        .update(chatMessages)
                        .set({
                            content: assistantText,
                            metadata: {
                                source: 'agents',
                                mode,
                                status,
                                ...(sawErrorText ? { error: truncate(sawErrorText, 2000) } : {}),
                                ...(sawAbort ? { aborted: true } : {}),
                                ...(chatId ? { mastraChatId: chatId } : {}),
                                ...(toolCalls.length > 0 ? { toolCalls } : {}),
                            },
                        })
                        .where(eq(chatMessages.id, assistantMessage.id));

                    await db
                        .update(chatSessions)
                        .set({ updatedAt: new Date() })
                        .where(eq(chatSessions.id, session.id));
                };

                const processChunk = (chunk: unknown) => {
                    if (!chunk || typeof chunk !== 'object') return;

                    const type = (chunk as { type?: unknown }).type;
                    if (type === 'text-delta') {
                        const delta = (chunk as { delta?: unknown }).delta;
                        if (typeof delta === 'string') assistantText += delta;
                    }

                    if (type === 'tool-input-available') {
                        const toolCallId = (chunk as { toolCallId?: unknown }).toolCallId;
                        const toolName = (chunk as { toolName?: unknown }).toolName;
                        if (typeof toolCallId === 'string' && typeof toolName === 'string') {
                            toolCallsById.set(toolCallId, {
                                toolCallId,
                                toolName,
                                status: 'called',
                            });
                        }
                    }

                    if (type === 'tool-output-available') {
                        const toolCallId = (chunk as { toolCallId?: unknown }).toolCallId;
                        if (typeof toolCallId === 'string') {
                            const existing = toolCallsById.get(toolCallId);
                            if (existing) toolCallsById.set(toolCallId, { ...existing, status: 'completed' });
                        }
                    }

                    if (type === 'tool-output-error') {
                        const toolCallId = (chunk as { toolCallId?: unknown }).toolCallId;
                        if (typeof toolCallId === 'string') {
                            const existing = toolCallsById.get(toolCallId);
                            if (existing) toolCallsById.set(toolCallId, { ...existing, status: 'error' });
                        }
                    }

                    if (type === 'error') {
                        const errorText = (chunk as { errorText?: unknown }).errorText;
                        if (typeof errorText === 'string') sawErrorText = errorText;
                    }

                    if (type === 'abort') {
                        sawAbort = true;
                    }
                };

                const reader = stream.getReader();
                const instrumentedStream = new ReadableStream({
                    async pull(controller) {
                        try {
                            const { value, done } = await reader.read();
                            if (done) {
                                await finalize(
                                    sawErrorText ? 'failed' : sawAbort ? 'cancelled' : 'finished',
                                );
                                controller.close();
                                return;
                            }

                            processChunk(value);
                            controller.enqueue(value);
                        } catch (err) {
                            sawErrorText = err instanceof Error ? err.message : String(err);
                            await finalize('failed');
                            controller.error(err);
                        }
                    },
                    async cancel(reason) {
                        sawAbort = true;
                        try {
                            await reader.cancel(reason);
                        } finally {
                            await finalize('cancelled');
                        }
                    },
                });

                const normalizedStream = normalizeToolInputStream(
                    instrumentedStream as ReadableStream<Record<string, unknown>>,
                );
                const response = createUIMessageStreamResponse({ stream: normalizedStream });
                response.headers.set('x-chat-session-id', String(session.id));
                return response;
            }

            return NextResponse.json(
                { error: 'No user message found in request' },
                { status: 400 },
            );
        }

        // --- Legacy Action Handler (for other operations like session creation/management) ---
        const { action } = body;
        switch (action) {
            case 'create_session': {
                const { session_id, stock_symbol, exchange_acronym, title } = body;
                // Create minimal session in User DB
                const session = await createChatSession({
                    id: session_id,
                    userId: user?.id,
                    stockSymbol: stock_symbol,
                    exchangeAcronym: exchange_acronym,
                    title,
                });
                return NextResponse.json({ success: true, session });
            }

            // The 'send_message' case is now handled by the block above for Vercel AI SDK compatibility.
            // This case is intentionally removed to enforce the new chat handling path.

            case 'refresh_data': {
                const { session_id } = body;
                if (!session_id) {
                    return NextResponse.json(
                        { error: 'session_id is required' },
                        { status: 400 },
                    );
                }
                const result = await refreshSessionData(session_id);
                return NextResponse.json({ success: true, ...result });
            }

            case 'archive_session': {
                const { session_id } = body;
                if (!session_id) {
                    return NextResponse.json(
                        { error: 'session_id is required' },
                        { status: 400 },
                    );
                }
                await archiveSession(session_id);
                return NextResponse.json({ success: true });
            }

            case 'update_title': {
                const { session_id, title } = body;
                if (!session_id || !title) {
                    return NextResponse.json(
                        { error: 'session_id and title are required' },
                        { status: 400 },
                    );
                }
                await updateSessionTitle(session_id, title);
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 },
                );
        }
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process request' },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const user = await getUser();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        switch (action) {
            case 'get_session': {
                const sessionId = searchParams.get('session_id');
                if (!sessionId) {
                    return NextResponse.json(
                        { error: 'session_id is required' },
                        { status: 400 },
                    );
                }
                const session = await getChatSession(sessionId);
                if (!session) {
                    return NextResponse.json(
                        { error: 'Session not found' },
                        { status: 404 },
                    );
                }
                return NextResponse.json({ success: true, session });
            }

            case 'get_messages': {
                const sessionId = searchParams.get('session_id');
                if (!sessionId) {
                    return NextResponse.json(
                        { error: 'session_id is required' },
                        { status: 400 },
                    );
                }

                const agent = mastra.getAgent('qaAgent');
                const memory = await agent.getMemory();

                if (!memory) {
                    // Fallback to empty if no memory configured
                    return NextResponse.json({ success: true, messages: [] });
                }

                // Use memory.recall to get messages for this thread
                const result = await memory.recall({ threadId: sessionId });
                const mastraMessages = result.messages;

                // Map Mastra messages to UI format if needed
                // Assuming mastraMessages are compatible or need slight mapping
                // The frontend expects { id, role, content, createdAt }
                const messages = mastraMessages.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content ?
                        (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
                        : '',
                    createdAt: m.createdAt,
                    // Handle tool invocations if present in Mastra message
                    // Mastra messages might store tool calls in `toolCalls` or `toolInvocations`
                    toolInvocations: m.toolCalls || m.toolInvocations,
                }));

                return NextResponse.json({ success: true, messages });
            }

            case 'get_user_sessions': {
                if (!user) {
                    return NextResponse.json(
                        { error: 'Authentication required' },
                        { status: 401 },
                    );
                }
                const limit = searchParams.get('limit');
                const sessions = await getUserSessions(
                    user.id,
                    limit ? parseInt(limit, 10) : undefined,
                );
                return NextResponse.json({ success: true, sessions });
            }

            case 'get_quota': {
                if (!user) {
                    return NextResponse.json(
                        { error: 'Authentication required' },
                        { status: 401 },
                    );
                }

                const periodKey = getUsagePeriodKey();
                const counters = await db
                    .select({
                        mode: usageCounters.mode,
                        used: usageCounters.used,
                    })
                    .from(usageCounters)
                    .where(
                        and(
                            eq(usageCounters.userId, user.id),
                            eq(usageCounters.periodKey, periodKey),
                        ),
                    );

                const counterMap = new Map(
                    counters.map((counter) => [counter.mode, counter.used]),
                );

                const quotas = Object.values(CHAT_MODES).map((modeValue) => {
                    const mode = modeValue as ChatMode;
                    const limit = resolveModeLimit(mode);
                    const used = counterMap.get(mode) ?? 0;
                    const remaining = Math.max(limit - used, 0);

                    return {
                        mode,
                        limit,
                        used,
                        remaining,
                        periodKey,
                        overLimit: remaining <= 0,
                    };
                });

                return NextResponse.json({ success: true, periodKey, quotas });
            }

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 },
                );
        }
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process request' },
            { status: 500 },
        );
    }
}
