import { NextRequest, NextResponse } from 'next/server';
import { createUIMessageStreamResponse, type UIMessage } from 'ai';
import { handleChatStream, type ChatStreamHandlerParams } from '@mastra/ai-sdk';
import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { mastra } from '@/features/mastra';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

type MinimalToolCallMetadata = {
    toolCallId: string;
    toolName: string;
    status: 'called' | 'completed' | 'error';
};

type MastraChatParams = ChatStreamHandlerParams<UIMessage> & {
    id?: string;
    stockSymbol?: string;
    exchangeAcronym?: string;
    sessionId?: number | string;
};

function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
}

function getMessageText(message: unknown): string {
    if (!message || typeof message !== 'object') return '';

    const maybeContent = (message as { content?: unknown }).content;
    if (typeof maybeContent === 'string') return maybeContent;

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

export async function POST(request: NextRequest) {
    try {
        const user = await getUser();

        const params = (await request.json()) as MastraChatParams;
        if (!Array.isArray(params.messages)) {
            return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
        }

        const { messages } = params;
        const chatId = params.id;
        const stockSymbol = params.stockSymbol;
        const exchangeAcronym = params.exchangeAcronym;

        const rawSessionId = params.sessionId;
        const sessionId =
            typeof rawSessionId === 'number'
                ? rawSessionId
                : typeof rawSessionId === 'string'
                      ? Number.parseInt(rawSessionId, 10)
                      : undefined;

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
                        userId: user?.id,
                        stockSymbol,
                        exchangeAcronym,
                        title: `Mastra Chat ${new Date().toLocaleDateString()}`,
                        metadata: {
                            source: 'mastra',
                            agentId: 'qaAgent',
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

        const lastMessage = messages[messages.length - 1] as
            | { id?: string; role?: string }
            | undefined;
        const lastUserMessageId =
            lastMessage?.role === 'user' && typeof lastMessage.id === 'string'
                ? lastMessage.id
                : undefined;

        if (lastMessage?.role === 'user') {
            const content = getMessageText(lastMessage);
            if (content) {
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
                            source: 'mastra',
                            ...(chatId ? { mastraChatId: chatId } : {}),
                            ...(lastUserMessageId ? { clientMessageId: lastUserMessageId } : {}),
                        },
                    });
                }
            }
        }

        const [assistantMessage] = await db
            .insert(chatMessages)
            .values({
                sessionId: session.id,
                role: 'assistant',
                content: '',
                metadata: {
                    source: 'mastra',
                    ...(chatId ? { mastraChatId: chatId } : {}),
                    ...(lastUserMessageId
                        ? { repliedToClientMessageId: lastUserMessageId }
                        : {}),
                },
            })
            .returning();

        const stream = await handleChatStream({
            mastra,
            agentId: 'qaAgent',
            params,
        });

        let assistantText = '';
        const toolCallsById = new Map<string, MinimalToolCallMetadata>();
        let sawErrorText: string | undefined;
        let sawAbort = false;
        let finalized = false;

        const finalize = async (status: 'finished' | 'cancelled' | 'failed') => {
            if (finalized) return;
            finalized = true;

            const toolCalls = Array.from(toolCallsById.values());

            await db
                .update(chatMessages)
                .set({
                    content: assistantText,
                    metadata: {
                        source: 'mastra',
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

        const response = createUIMessageStreamResponse({ stream: instrumentedStream });
        response.headers.set('x-chat-session-id', String(session.id));
        return response;
    } catch (error) {
        console.error('Mastra chat error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process request' },
            { status: 500 },
        );
    }
}
