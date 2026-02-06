import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai';
import { handleChatStream, type ChatStreamHandlerParams } from '@mastra/ai-sdk';
import { RequestContext } from '@mastra/core/request-context';
import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';

import { extractStockInfoFromText } from '@/features/agents/actions/extract';
import {
    CHAT_MODES,
    DEFAULT_CHAT_MODE,
    FOLLOW_UP_ALLOWED_MODES,
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
import { TOOL_MODEL_ID } from '@/features/mastra/providers/openrouter';
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
    agentRunEvents,
    chatMessages,
    chatSessions,
    reports,
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
    input?: unknown;
    output?: unknown;
    errorText?: string;
    providerExecuted?: boolean;
};

type UnifiedChatOptions = {
    stockSymbol?: string;
    exchangeAcronym?: string;
    forceRefresh?: boolean;
    query?: string;
    fromReport?: boolean;
};

type MastraChatParams = ChatStreamHandlerParams<UIMessage> & {
    id?: string;
    session_id?: string;
    sessionId?: string;
    stockSymbol?: string;
    exchangeAcronym?: string;
    forceRefresh?: boolean;
    options?: UnifiedChatOptions;
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

function buildStepSummary(text: string, maxLength = 200): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
}

function removeToolCallBlocks(text: string): string {
    if (!text) return text;
    return text.replace(/\[TOOL_CALL\][\s\S]*?\[\/TOOL_CALL\]/g, '');
}

function createToolCallSanitizer() {
    const TOOL_CALL_START = '[TOOL_CALL]';
    const TOOL_CALL_END = '[/TOOL_CALL]';
    const TAIL_LENGTH = 20;
    let buffer = '';

    const update = (delta: string) => {
        buffer += delta;
        const cleaned = removeToolCallBlocks(buffer);

        const lastStart = cleaned.lastIndexOf(TOOL_CALL_START);
        const lastEnd = cleaned.lastIndexOf(TOOL_CALL_END);
        if (lastStart !== -1 && lastStart > lastEnd) {
            const emit = cleaned.slice(0, lastStart);
            buffer = cleaned.slice(lastStart);
            return emit;
        }

        if (cleaned.length > TAIL_LENGTH) {
            const emit = cleaned.slice(0, cleaned.length - TAIL_LENGTH);
            buffer = cleaned.slice(cleaned.length - TAIL_LENGTH);
            return emit;
        }

        buffer = cleaned;
        return '';
    };

    const flush = () => {
        let cleaned = removeToolCallBlocks(buffer);
        const lastStart = cleaned.lastIndexOf(TOOL_CALL_START);
        if (lastStart !== -1) {
            cleaned = cleaned.slice(0, lastStart);
        }
        buffer = '';
        return cleaned;
    };

    return { update, flush };
}

function normalizeChatOptions(params: MastraChatParams): UnifiedChatOptions {
    const options = params.options ?? {};
    return {
        stockSymbol: params.stockSymbol ?? options.stockSymbol,
        exchangeAcronym: params.exchangeAcronym ?? options.exchangeAcronym,
        forceRefresh:
            typeof params.forceRefresh === 'boolean'
                ? params.forceRefresh
                : options.forceRefresh,
        query: options.query,
        fromReport: options.fromReport,
    };
}

function buildStoredParts(parts: Array<Record<string, unknown>>) {
    return JSON.stringify({ parts });
}

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b),
    );
    const body = entries
        .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
        .join(',');
    return `{${body}}`;
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
    const sanitized: AgentChatMessage[] = [];
    messages.forEach((message) => {
        const text = getMessageText(message);
        if (!text.trim()) return;
        sanitized.push({
            id: message.id,
            role: message.role,
            content: text,
        });
    });
    return sanitized;
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

function shouldEnableRigorousTools(text: string): boolean {
    return INSTANT_TOOL_TRIGGER.test(text) || /最新|当前|实时|今天|近期|财报|数据|指标|估值|市盈率|市值|PE|EPS/i.test(text);
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

function resolveAgentId(mode: ChatMode): 'instantAgent' | 'rigorousAgent' {
    return mode === CHAT_MODES.RIGOROUS ? 'rigorousAgent' : 'instantAgent';
}

function resolveLiteAgentId(mode: ChatMode): 'instantLiteAgent' | 'rigorousLiteAgent' {
    return mode === CHAT_MODES.RIGOROUS ? 'rigorousLiteAgent' : 'instantLiteAgent';
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

const ENABLE_MASTRA_MEMORY = process.env.MASTRA_MEMORY_ENABLED === 'true';

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
            const options = normalizeChatOptions(params);
            const fromReport = Boolean(options.fromReport);

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
                            stock_symbol: options.stockSymbol ?? null,
                            exchange_acronym: options.exchangeAcronym ?? null,
                            title: `Chat ${new Date().toLocaleDateString()}`,
                            metadata: {
                                source: 'agents',
                                agentId:
                                    mode === CHAT_MODES.INSTANT || mode === CHAT_MODES.RIGOROUS
                                        ? resolveAgentId(mode)
                                        : `${mode}Workflow`,
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
                const enableTools =
                    mode === CHAT_MODES.INSTANT
                        ? shouldEnableInstantTools(content)
                        : mode === CHAT_MODES.RIGOROUS
                            ? shouldEnableRigorousTools(content)
                            : false;
                const instantToolChoice =
                    mode === CHAT_MODES.INSTANT && !enableTools ? 'none' : undefined;

                if (fromReport && !FOLLOW_UP_ALLOWED_MODES.includes(mode)) {
                    return NextResponse.json(
                        { error: 'Follow-up is only allowed in instant/rigorous mode' },
                        { status: 400 },
                    );
                }

                const reportContext =
                    fromReport &&
                    typeof body?.reportContext === 'string' &&
                    body.reportContext.trim().length > 0
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
                        content: buildStoredParts([{ type: 'text', text: content }]),
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
                    const resolvedStockSymbol = stockContext.stockSymbol ?? options.stockSymbol;
                    const resolvedExchangeAcronym =
                        stockContext.exchangeAcronym ?? options.exchangeAcronym;

                    if (!resolvedStockSymbol || !resolvedExchangeAcronym) {
                        return NextResponse.json(
                            {
                                error:
                                    'stockSymbol and exchangeAcronym are required for consensus mode',
                            },
                            { status: 400 },
                        );
                    }

                    if (!stockContext.stockSymbol && options.stockSymbol) {
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
                            typeof options.forceRefresh === 'boolean'
                                ? options.forceRefresh
                                : undefined,
                        sessionId: session.id,
                        query: options.query ?? content,
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
                    const storedParts: Array<Record<string, unknown>> = [];

                    const finalize = async () => {
                        if (assistantText.trim()) {
                            storedParts.unshift({ type: 'text', text: assistantText });
                        }
                        await db
                            .update(chatMessages)
                            .set({
                                content: buildStoredParts(storedParts),
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
                                    storedParts.push({
                                        type: 'data',
                                        name: event.type,
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
                                const workflowOutput =
                                    (result &&
                                        typeof result === 'object' &&
                                        'result' in result
                                        ? (result as { result?: { report?: any; reportDbId?: number } }).result
                                        : result) as { report?: any; reportDbId?: number } | undefined;

                                if (workflowOutput?.report) {
                                    assistantText =
                                        workflowOutput.report.overallSummary ??
                                        workflowOutput.report.title ??
                                        assistantText;

                                    try {
                                        const reportPayload = {
                                            runId: run.id,
                                            reportId: workflowOutput.reportDbId,
                                            reportType: 'consensus',
                                            report: workflowOutput.report,
                                            timestamp: Date.now(),
                                        };
                                        writer.write({
                                            type: 'data-report',
                                            data: reportPayload,
                                        });
                                        storedParts.push({
                                            type: 'data',
                                            name: 'report',
                                            data: reportPayload,
                                        });

                                        const summaryText = buildStepSummary(assistantText);
                                        if (summaryText) {
                                            const stepSummaryPayload = {
                                                stepId: 'consensus.summary',
                                                summary: summaryText,
                                                timestamp: Date.now(),
                                            };
                                            writer.write({
                                                type: 'data-step-summary',
                                                data: stepSummaryPayload,
                                            });
                                            storedParts.push({
                                                type: 'data',
                                                name: 'step-summary',
                                                data: stepSummaryPayload,
                                            });
                                        }
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
                    const resolvedStockSymbol = stockContext.stockSymbol ?? options.stockSymbol;
                    const resolvedExchangeAcronym =
                        stockContext.exchangeAcronym ?? options.exchangeAcronym;

                    if (!resolvedStockSymbol || !resolvedExchangeAcronym) {
                        return NextResponse.json(
                            {
                                error:
                                    'stockSymbol and exchangeAcronym are required for research mode',
                            },
                            { status: 400 },
                        );
                    }

                    if (!stockContext.stockSymbol && options.stockSymbol) {
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
                        query: options.query ?? content,
                        forceRefresh:
                            typeof options.forceRefresh === 'boolean'
                                ? options.forceRefresh
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
                    const storedParts: Array<Record<string, unknown>> = [];

                    const finalize = async () => {
                        if (assistantText.trim()) {
                            storedParts.unshift({ type: 'text', text: assistantText });
                        }
                        await db
                            .update(chatMessages)
                            .set({
                                content: buildStoredParts(storedParts),
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
                                    storedParts.push({
                                        type: 'data',
                                        name: event.type,
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
                                const workflowOutput =
                                    (result &&
                                        typeof result === 'object' &&
                                        'result' in result
                                        ? (result as { result?: { report?: any; reportDbId?: number } }).result
                                        : result) as { report?: any; reportDbId?: number } | undefined;

                                if (workflowOutput?.report) {
                                    assistantText =
                                        workflowOutput.report.summary ??
                                        workflowOutput.report.title ??
                                        assistantText;

                                    try {
                                        const stepSummaryPayload = {
                                            stepId: 'research.report',
                                            summary:
                                                workflowOutput.report.summary ??
                                                workflowOutput.report.title,
                                            timestamp: Date.now(),
                                        };
                                        writer.write({
                                            type: 'data-step-summary',
                                            data: stepSummaryPayload,
                                        });
                                        storedParts.push({
                                            type: 'data',
                                            name: 'step-summary',
                                            data: stepSummaryPayload,
                                        });
                                    } catch (err) {
                                        console.warn(
                                            'Failed to write step summary to stream:',
                                            err,
                                        );
                                    }

                                    try {
                                        const reportPayload = {
                                            runId: run.id,
                                            reportId: workflowOutput.reportDbId,
                                            reportType: 'research',
                                            report: workflowOutput.report,
                                            timestamp: Date.now(),
                                        };
                                        writer.write({
                                            type: 'data-report',
                                            data: reportPayload,
                                        });
                                        storedParts.push({
                                            type: 'data',
                                            name: 'report',
                                            data: reportPayload,
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
                    agentId: enableTools ? resolveAgentId(mode) : resolveLiteAgentId(mode),
                    params: {
                        ...params,
                        messages: sanitizeMessagesForModel(params.messages) as unknown as UIMessage[],
                    },
                    defaultOptions: {
                        ...(ENABLE_MASTRA_MEMORY
                            ? {
                                memory: {
                                    thread: { id: session.id },
                                    resource: user?.id ? String(user.id) : session.id,
                                },
                            }
                            : {}),
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
                const storedParts: Array<Record<string, unknown>> = [];
                const toolCallSanitizer = createToolCallSanitizer();
                const seenToolInputs = new Set<string>();
                const suppressedToolCallIds = new Set<string>();

                const buildToolParts = () => {
                    const parts: Array<Record<string, unknown>> = [];

                    for (const call of toolCallsById.values()) {
                        const toolName =
                            typeof call.toolName === 'string' && call.toolName.trim().length > 0
                                ? call.toolName
                                : null;

                        const base =
                            toolName
                                ? {
                                    type: `tool-${toolName}`,
                                    toolCallId: call.toolCallId,
                                }
                                : {
                                    type: 'dynamic-tool',
                                    toolName: call.toolName ?? 'tool',
                                    toolCallId: call.toolCallId,
                                };

                        const input = call.input ?? {};

                        if (call.status === 'completed') {
                            parts.push({
                                ...base,
                                state: 'output-available',
                                input,
                                output: call.output ?? {},
                                ...(call.providerExecuted !== undefined
                                    ? { providerExecuted: call.providerExecuted }
                                    : {}),
                            });
                            continue;
                        }

                        if (call.status === 'error') {
                            parts.push({
                                ...base,
                                state: 'output-error',
                                input,
                                errorText: call.errorText ?? '工具执行失败',
                                ...(call.providerExecuted !== undefined
                                    ? { providerExecuted: call.providerExecuted }
                                    : {}),
                            });
                            continue;
                        }

                        parts.push({
                            ...base,
                            state: 'input-available',
                            input,
                            ...(call.providerExecuted !== undefined
                                ? { providerExecuted: call.providerExecuted }
                                : {}),
                        });
                    }

                    return parts;
                };

                const finalize = async (status: 'finished' | 'cancelled' | 'failed') => {
                    if (finalized) return;
                    finalized = true;

                    if (quotaSnapshot && status !== 'finished') {
                        await rollbackUsage({
                            ...quotaSnapshot,
                            reason: status === 'cancelled' ? 'qa_cancelled' : 'qa_failed',
                        });
                    }

                    const tail = toolCallSanitizer.flush();
                    if (tail) assistantText += tail;

                    const toolCalls = Array.from(toolCallsById.values());

                    if (assistantText.trim()) {
                        storedParts.unshift({ type: 'text', text: assistantText });
                    }

                    const toolParts = buildToolParts();
                    if (toolParts.length > 0) {
                        const insertIndex = assistantText.trim() ? 1 : 0;
                        storedParts.splice(insertIndex, 0, ...toolParts);
                    }

                    await db
                        .update(chatMessages)
                        .set({
                            content: buildStoredParts(storedParts),
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
                        if (typeof delta === 'string') {
                            const cleaned = toolCallSanitizer.update(delta);
                            if (cleaned) {
                                assistantText += cleaned;
                                return {
                                    forward: true,
                                    chunk: { ...(chunk as Record<string, unknown>), delta: cleaned },
                                };
                            }
                            return { forward: false };
                        }
                    }

                    if (type === 'data') {
                        const name = (chunk as { name?: unknown }).name;
                        const data = (chunk as { data?: unknown }).data;
                        if (typeof name === 'string') {
                            storedParts.push({
                                type: 'data',
                                name,
                                data,
                            });
                        }
                    }

                    if (typeof type === 'string' && type.startsWith('data-')) {
                        const name = type.replace('data-', '');
                        const data = (chunk as { data?: unknown }).data;
                        storedParts.push({
                            type: 'data',
                            name,
                            data,
                        });
                    }

                    if (type === 'tool-input-available') {
                        const toolCallId = (chunk as { toolCallId?: unknown }).toolCallId;
                        const toolName = (chunk as { toolName?: unknown }).toolName;
                        const input = (chunk as { input?: unknown }).input;
                        const providerExecuted = (chunk as { providerExecuted?: unknown }).providerExecuted;
                        if (typeof toolCallId === 'string' && typeof toolName === 'string') {
                            const dedupeKey = `${toolName}:${stableStringify(input ?? {})}`;
                            if (seenToolInputs.has(dedupeKey)) {
                                suppressedToolCallIds.add(toolCallId);
                                return { forward: false };
                            }
                            seenToolInputs.add(dedupeKey);
                            toolCallsById.set(toolCallId, {
                                toolCallId,
                                toolName,
                                status: 'called',
                                input,
                                providerExecuted:
                                    typeof providerExecuted === 'boolean' ? providerExecuted : undefined,
                            });
                        }
                    }

                    if (type === 'tool-output-available') {
                        const toolCallId = (chunk as { toolCallId?: unknown }).toolCallId;
                        const output = (chunk as { output?: unknown }).output;
                        if (typeof toolCallId === 'string') {
                            if (suppressedToolCallIds.has(toolCallId)) {
                                return { forward: false };
                            }
                            const existing = toolCallsById.get(toolCallId);
                            if (existing) {
                                toolCallsById.set(toolCallId, {
                                    ...existing,
                                    status: 'completed',
                                    output,
                                });
                            } else {
                                const rawToolName = (chunk as { toolName?: unknown }).toolName;
                                const toolName =
                                    typeof rawToolName === 'string' && rawToolName.trim().length > 0
                                        ? rawToolName
                                        : 'tool';
                                toolCallsById.set(toolCallId, {
                                    toolCallId,
                                    toolName,
                                    status: 'completed',
                                    output,
                                });
                            }
                        }
                    }

                    if (type === 'tool-output-error') {
                        const toolCallId = (chunk as { toolCallId?: unknown }).toolCallId;
                        if (typeof toolCallId === 'string') {
                            if (suppressedToolCallIds.has(toolCallId)) {
                                return { forward: false };
                            }
                            const existing = toolCallsById.get(toolCallId);
                            const errorText = (chunk as { errorText?: unknown }).errorText;
                            if (existing) {
                                toolCallsById.set(toolCallId, {
                                    ...existing,
                                    status: 'error',
                                    errorText:
                                        typeof errorText === 'string' ? errorText : 'tool error',
                                });
                            } else {
                                const rawToolName = (chunk as { toolName?: unknown }).toolName;
                                const toolName =
                                    typeof rawToolName === 'string' && rawToolName.trim().length > 0
                                        ? rawToolName
                                        : 'tool';
                                toolCallsById.set(toolCallId, {
                                    toolCallId,
                                    toolName,
                                    status: 'error',
                                    errorText:
                                        typeof errorText === 'string' ? errorText : 'tool error',
                                });
                            }
                        }
                    }

                    if (type === 'tool-output-denied') {
                        const toolCallId = (chunk as { toolCallId?: unknown }).toolCallId;
                        if (typeof toolCallId === 'string') {
                            if (suppressedToolCallIds.has(toolCallId)) {
                                return { forward: false };
                            }
                            const existing = toolCallsById.get(toolCallId);
                            if (existing) {
                                toolCallsById.set(toolCallId, {
                                    ...existing,
                                    status: 'error',
                                    errorText: 'tool output denied',
                                });
                            } else {
                                const rawToolName = (chunk as { toolName?: unknown }).toolName;
                                const toolName =
                                    typeof rawToolName === 'string' && rawToolName.trim().length > 0
                                        ? rawToolName
                                        : 'tool';
                                toolCallsById.set(toolCallId, {
                                    toolCallId,
                                    toolName,
                                    status: 'error',
                                    errorText: 'tool output denied',
                                });
                            }
                        }
                    }

                    if (type === 'error') {
                        const errorText = (chunk as { errorText?: unknown }).errorText;
                        if (typeof errorText === 'string') sawErrorText = errorText;
                    }

                    if (type === 'abort') {
                        sawAbort = true;
                    }

                    return { forward: true, chunk };
                };

                const reader = stream.getReader();
                const instrumentedStream = new ReadableStream({
                    async pull(controller) {
                        try {
                            const { value, done } = await reader.read();
                            if (done) {
                                const tail = toolCallSanitizer.flush();
                                if (tail) assistantText += tail;
                                const summaryText = buildStepSummary(assistantText);
                                if (summaryText) {
                                    const stepSummaryPayload = {
                                        stepId: mode,
                                        summary: summaryText,
                                        timestamp: Date.now(),
                                    };
                                    storedParts.push({
                                        type: 'data',
                                        name: 'step-summary',
                                        data: stepSummaryPayload,
                                    });
                                    controller.enqueue({
                                        type: 'data-step-summary',
                                        data: stepSummaryPayload,
                                    });
                                }

                                if (mode === CHAT_MODES.RIGOROUS && summaryText) {
                                    const decisionPayload = {
                                        decision: '已完成严谨分析',
                                        rationale: summaryText,
                                        timestamp: Date.now(),
                                    };
                                    storedParts.push({
                                        type: 'data',
                                        name: 'decision',
                                        data: decisionPayload,
                                    });
                                    controller.enqueue({
                                        type: 'data-decision',
                                        data: decisionPayload,
                                    });
                                }
                                await finalize(
                                    sawErrorText ? 'failed' : sawAbort ? 'cancelled' : 'finished',
                                );
                                controller.close();
                                return;
                            }

                            const processed = processChunk(value);
                            if (processed?.forward) {
                                controller.enqueue(processed.chunk);
                            }
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
                const response = createUIMessageStreamResponse({
                    stream: normalizedStream as unknown as Parameters<typeof createUIMessageStreamResponse>[0]['stream'],
                });
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
                const messages = await db
                    .select({
                        id: chatMessages.id,
                        role: chatMessages.role,
                        content: chatMessages.content,
                        createdAt: chatMessages.createdAt,
                        metadata: chatMessages.metadata,
                    })
                    .from(chatMessages)
                    .where(eq(chatMessages.sessionId, sessionId))
                    .orderBy(chatMessages.createdAt);

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

            case 'get_events': {
                const runId = searchParams.get('run_id');
                if (!runId) {
                    return NextResponse.json({ error: 'run_id is required' }, { status: 400 });
                }
                const runIdNum = Number.parseInt(runId, 10);
                if (Number.isNaN(runIdNum)) {
                    return NextResponse.json({ error: 'Invalid run_id' }, { status: 400 });
                }

                const events = await db
                    .select({
                        id: agentRunEvents.id,
                        type: agentRunEvents.type,
                        payload: agentRunEvents.payload,
                        createdAt: agentRunEvents.createdAt,
                    })
                    .from(agentRunEvents)
                    .where(eq(agentRunEvents.agentRunId, runIdNum))
                    .orderBy(agentRunEvents.id);

                return NextResponse.json({ success: true, events });
            }

            case 'get_report': {
                const runId = searchParams.get('run_id');
                if (!runId) {
                    return NextResponse.json({ error: 'run_id is required' }, { status: 400 });
                }
                const runIdNum = Number.parseInt(runId, 10);
                if (Number.isNaN(runIdNum)) {
                    return NextResponse.json({ error: 'Invalid run_id' }, { status: 400 });
                }

                const [report] = await db
                    .select()
                    .from(reports)
                    .where(eq(reports.agentRunId, runIdNum))
                    .orderBy(desc(reports.createdAt))
                    .limit(1);

                if (!report) {
                    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
                }

                return NextResponse.json({ success: true, report });
            }

            case 'get_run_status': {
                const runId = searchParams.get('run_id');
                if (!runId) {
                    return NextResponse.json({ error: 'run_id is required' }, { status: 400 });
                }
                const runIdNum = Number.parseInt(runId, 10);
                if (Number.isNaN(runIdNum)) {
                    return NextResponse.json({ error: 'Invalid run_id' }, { status: 400 });
                }

                const [run] = await db
                    .select()
                    .from(agentRuns)
                    .where(eq(agentRuns.id, runIdNum))
                    .limit(1);

                if (!run) {
                    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
                }

                const steps = await db
                    .select({
                        stepName: agentRunSteps.stepName,
                        status: agentRunSteps.status,
                        startedAt: agentRunSteps.startedAt,
                        completedAt: agentRunSteps.completedAt,
                    })
                    .from(agentRunSteps)
                    .where(eq(agentRunSteps.agentRunId, runIdNum))
                    .orderBy(agentRunSteps.stepOrder);

                const [thinkingEvent] = await db
                    .select({
                        payload: agentRunEvents.payload,
                    })
                    .from(agentRunEvents)
                    .where(
                        and(
                            eq(agentRunEvents.agentRunId, runIdNum),
                            eq(agentRunEvents.type, 'thinking'),
                        ),
                    )
                    .orderBy(desc(agentRunEvents.id))
                    .limit(1);

                return NextResponse.json({
                    success: true,
                    run,
                    steps,
                    thinking: thinkingEvent?.payload ?? null,
                });
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
