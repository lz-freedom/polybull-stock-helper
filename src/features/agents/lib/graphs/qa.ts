import { db } from '@/lib/db/drizzle';
import {
    chatSessions,
    chatMessages,
    agentRuns,
    reports,
    AGENT_TYPES,
    AGENT_RUN_STATUS,
    type ChatSession,
    type ChatMessage,
    type FactsSnapshot,
} from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { createTextStream, MODELS, type ModelId } from '../services/llm-client';
import {
    getOrFetchSnapshot,
    extractStockInfo,
    extractLatestFinancials,
    extractRecentNews,
} from '../services/facts-snapshot-service';

const QA_SYSTEM_PROMPT = `You are a helpful financial assistant specializing in stock analysis.
You have access to real-time financial data and can provide insights based on facts.
Be concise but thorough. Cite specific data points when available.
If you don't have enough information to answer confidently, say so.`;

function buildContextFromSnapshot(snapshot: FactsSnapshot): string {
    const stockInfo = extractStockInfo(snapshot);
    const financials = extractLatestFinancials(snapshot);
    const news = extractRecentNews(snapshot, 5);

    return `## Current Data for ${stockInfo.symbol} (${stockInfo.name ?? 'Unknown'})
Sector: ${stockInfo.sector ?? 'N/A'} | Industry: ${stockInfo.industry ?? 'N/A'}
Market Cap: ${stockInfo.marketCap ? `$${(stockInfo.marketCap / 1e9).toFixed(2)}B` : 'N/A'}

### Financial Highlights
- Annual Revenue: ${financials.annualRevenue ? `$${(financials.annualRevenue / 1e9).toFixed(2)}B` : 'N/A'}
- Net Income: ${financials.annualNetIncome ? `$${(financials.annualNetIncome / 1e9).toFixed(2)}B` : 'N/A'}
- Total Assets: ${financials.totalAssets ? `$${(financials.totalAssets / 1e9).toFixed(2)}B` : 'N/A'}
- Free Cash Flow: ${financials.freeCashFlow ? `$${(financials.freeCashFlow / 1e9).toFixed(2)}B` : 'N/A'}

### Recent News
${news.map((n) => `- ${n.title ?? 'No title'}`).join('\n')}

Data fetched at: ${snapshot.fetchedAt.toISOString()}`;
}

function buildConversationPrompt(
    messages: Array<{ role: string; content: string }>,
    context: string,
    referencedReports?: string[],
): string {
    let prompt = `${context}\n\n`;

    if (referencedReports && referencedReports.length > 0) {
        prompt += `## Referenced Reports\n${referencedReports.join('\n\n')}\n\n`;
    }

    prompt += '## Conversation\n';
    for (const msg of messages) {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }

    return prompt;
}

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

export interface SendMessageInput {
    sessionId: string;
    content: string;
    userId?: number;
    referencedReportIds?: number[];
    forceDataRefresh?: boolean;
}

export interface SendMessageResult {
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    stream: AsyncIterable<string>;
}

export async function sendMessage(
    input: SendMessageInput,
): Promise<SendMessageResult> {
    let session = await getChatSession(input.sessionId);
    
    // Auto-create session if it doesn't exist (handles race conditions from frontend)
    if (!session) {
        session = await createChatSession({
            id: input.sessionId,
            userId: input.userId,
            title: input.content.slice(0, 50) || 'New Chat',
            stockSymbol: undefined,
            exchangeAcronym: undefined,
        });
    }

    const [userMessage] = await db
        .insert(chatMessages)
        .values({
            sessionId: input.sessionId,
            role: 'user',
            content: input.content,
            referencedReportIds: input.referencedReportIds,
        })
        .returning();

    const previousMessages = await getChatMessages(input.sessionId, 20);

    let context = '';
    let snapshot: FactsSnapshot | null = null;

    if (session.stock_symbol && session.exchange_acronym) {
        snapshot = await getOrFetchSnapshot(
            session.stock_symbol,
            session.exchange_acronym,
            { forceRefresh: input.forceDataRefresh },
        );
        context = buildContextFromSnapshot(snapshot);
    }

    let referencedReportSummaries: string[] = [];
    if (input.referencedReportIds && input.referencedReportIds.length > 0) {
        const referencedReports = await db
            .select()
            .from(reports)
            .where(
                eq(reports.id, input.referencedReportIds[0]),
            );

        referencedReportSummaries = referencedReports.map(
            (r) => `**${r.title ?? 'Report'}**: ${r.summary ?? 'No summary'}`,
        );
    }

    const conversationHistory = previousMessages.map((m) => ({
        role: m.role,
        content: m.content,
    }));

    conversationHistory.push({ role: 'user', content: input.content });

    const prompt = buildConversationPrompt(
        conversationHistory,
        context,
        referencedReportSummaries,
    );

    const [assistantMessage] = await db
        .insert(chatMessages)
        .values({
            sessionId: input.sessionId,
            role: 'assistant',
            content: '',
        })
        .returning();

    const streamResult = createTextStream(prompt, {
        modelId: MODELS.DEFAULT,
        system: QA_SYSTEM_PROMPT,
        temperature: 0.7,
        onFinish: async (text) => {
            await db
                .update(chatMessages)
                .set({ content: text })
                .where(eq(chatMessages.id, assistantMessage.id));

            await db
                .update(chatSessions)
                .set({ updatedAt: new Date() })
                .where(eq(chatSessions.id, input.sessionId));
        },
    });

    return {
        userMessage,
        assistantMessage,
        stream: streamResult.textStream,
    };
}

export async function refreshSessionData(sessionId: string): Promise<{
    snapshot: FactsSnapshot;
    agentRunId: number;
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

    const [run] = await db
        .insert(agentRuns)
        .values({
            userId: session.userId ?? undefined,
            agentType: AGENT_TYPES.QA,
            status: AGENT_RUN_STATUS.COMPLETED,
            input: {
                action: 'refresh_data',
                sessionId,
                stockSymbol: session.stock_symbol,
                exchangeAcronym: session.exchange_acronym,
            },
            output: { snapshotId: snapshot.id },
            factsSnapshotId: snapshot.id,
            startedAt: new Date(),
            completedAt: new Date(),
        })
        .returning();

    await db.insert(chatMessages).values({
        sessionId,
        role: 'system',
        content: `Data refreshed for ${session.stock_symbol}. Latest data as of ${snapshot.fetchedAt.toISOString()}.`,
        agentRunId: run.id,
    });

    return { snapshot, agentRunId: run.id };
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
