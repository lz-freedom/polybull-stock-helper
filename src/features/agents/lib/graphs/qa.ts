import { eq, desc, and } from 'drizzle-orm';

import { extractStockInfoFromText } from '@/features/agents/actions/extract';
import { mastra } from '@/features/mastra';
import { db } from '@/lib/db/drizzle';
import {
    chatSessions,
    chatMessages,
    type ChatSession,
    type ChatMessage,
    type FactsSnapshot,
} from '@/lib/db/schema';
import {
    getOrFetchSnapshot,
} from '../services/facts-snapshot-service';

export interface CreateSessionInput {
    id?: string;
    userId?: number;
    stockSymbol?: string;
    exchangeAcronym?: string;
    title?: string;
}

export async function createChatSession(
    input: CreateSessionInput,
): Promise<ChatSession> {
    const [session] = await db
        .insert(chatSessions)
        .values({
            id: input.id,
            userId: input.userId,
            stock_symbol: input.stockSymbol,
            exchange_acronym: input.exchangeAcronym,
            title: input.title ?? `Chat ${new Date().toLocaleDateString()}`,
        })
        .returning();

    return session;
}

export async function getChatSession(
    sessionId: string,
): Promise<ChatSession | null> {
    const [session] = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.id, sessionId));

    return session ?? null;
}

export async function getChatMessages(
    sessionId: string,
    limit: number = 50,
): Promise<ChatMessage[]> {
    return db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(chatMessages.createdAt)
        .limit(limit);
}

export async function getUserSessions(
    userId: number,
    limit: number = 20,
): Promise<ChatSession[]> {
    return db
        .select()
        .from(chatSessions)
        .where(
            and(eq(chatSessions.userId, userId), eq(chatSessions.isArchived, false)),
        )
        .orderBy(desc(chatSessions.updatedAt))
        .limit(limit);
}

// Deprecated in favor of Mastra memory, but kept for legacy route compatibility if needed
// or we should update route.ts to not use this.
// For now, restoring a minimal version to satisfy imports.
export async function refreshSessionData(sessionId: string): Promise<{
    snapshot: FactsSnapshot;
}> {
    const session = await getChatSession(sessionId);
    if (!session) {
        throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.stock_symbol || !session.exchange_acronym) {
        throw new Error('Session has no associated stock');
    }

    const snapshot = await getOrFetchSnapshot(
        session.stock_symbol,
        session.exchange_acronym,
        { forceRefresh: true },
    );

    return { snapshot };
}

export async function archiveSession(sessionId: string): Promise<void> {
    await db
        .update(chatSessions)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(chatSessions.id, sessionId));
}

export async function updateSessionTitle(
    sessionId: string,
    title: string,
): Promise<void> {
    await db
        .update(chatSessions)
        .set({ title, updatedAt: new Date() })
        .where(eq(chatSessions.id, sessionId));
}

export async function updateSessionStock(
    sessionId: string,
    stockSymbol: string,
    exchangeAcronym?: string | null,
): Promise<void> {
    await db
        .update(chatSessions)
        .set({
            stock_symbol: stockSymbol,
            exchange_acronym: exchangeAcronym ?? null,
            updatedAt: new Date(),
        })
        .where(eq(chatSessions.id, sessionId));
}

export async function sendMessage(input: {
    sessionId: string;
    content: string;
    forceDataRefresh?: boolean;
    userId?: number;
}): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const session = await getChatSession(input.sessionId);
    if (!session) {
        throw new Error(`Session ${input.sessionId} not found`);
    }
    if (input.userId && session.userId && session.userId !== input.userId) {
        throw new Error('Session access denied');
    }
    if (input.userId && !session.userId) {
        await db
            .update(chatSessions)
            .set({ userId: input.userId })
            .where(eq(chatSessions.id, session.id));
    }

    const [userMessage] = await db
        .insert(chatMessages)
        .values({
            sessionId: input.sessionId,
            role: 'user',
            content: input.content,
            metadata: {
                source: 'mastra-action',
                forceDataRefresh: input.forceDataRefresh ?? false,
            },
        })
        .returning();

    const [assistantMessage] = await db
        .insert(chatMessages)
        .values({
            sessionId: input.sessionId,
            role: 'assistant',
            content: '',
            metadata: {
                source: 'mastra-action',
                status: 'pending',
            },
        })
        .returning();

    const agent = mastra.getAgent('instantLiteAgent');
    const memory = {
        thread: { id: input.sessionId },
        resource: input.userId ? String(input.userId) : input.sessionId,
    };
    const system = input.forceDataRefresh
        ? 'When calling getStockSnapshot, always set forceRefresh=true for this run.'
        : undefined;

    let detectedSymbol = session.stock_symbol ?? undefined;
    let detectedExchange = session.exchange_acronym ?? undefined;

    if (!detectedSymbol) {
        const extracted = await extractStockInfoFromText(input.content);
        if (extracted?.symbol) {
            detectedSymbol = extracted.symbol;
            detectedExchange = extracted.exchange ?? undefined;
            await updateSessionStock(input.sessionId, extracted.symbol, detectedExchange);
        }
    }

    let updatedAssistantMessage = assistantMessage;
    try {
        const result = await agent.generate(input.content, {
            memory,
            ...(system ? { system } : {}),
            ...(detectedSymbol
                ? {
                    context: [
                        {
                            role: 'system',
                            content: `Detected stock for this thread: ${detectedSymbol}${
                                detectedExchange ? ` (${detectedExchange})` : ''
                            }. If you need current data, call getStockSnapshot first, then summarize the key takeaways.`,
                        },
                    ],
                }
                : {}),
            providerOptions: {
                openai: {
                    store: false,
                },
            },
        });

        const metadata = {
            source: 'mastra-action',
            status: 'finished' as const,
            ...(result.runId ? { runId: result.runId } : {}),
            ...(result.toolCalls?.length ? { toolCalls: result.toolCalls } : {}),
            ...(result.toolResults?.length ? { toolResults: result.toolResults } : {}),
            ...(result.sources?.length ? { sources: result.sources } : {}),
        };

        const [updated] = await db
            .update(chatMessages)
            .set({
                content: result.text,
                metadata,
            })
            .where(eq(chatMessages.id, assistantMessage.id))
            .returning();

        if (updated) {
            updatedAssistantMessage = updated;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
        await db
            .update(chatMessages)
            .set({
                metadata: {
                    source: 'mastra-action',
                    status: 'failed',
                    error: errorMessage,
                },
            })
            .where(eq(chatMessages.id, assistantMessage.id));
        await db
            .update(chatSessions)
            .set({ updatedAt: new Date() })
            .where(eq(chatSessions.id, input.sessionId));
        throw error;
    }

    await db
        .update(chatSessions)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessions.id, input.sessionId));

    return { userMessage, assistantMessage: updatedAssistantMessage };
}
