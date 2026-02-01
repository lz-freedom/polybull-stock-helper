'use server';

import { z } from 'zod';
import { validatedActionWithUser } from '@/features/auth/lib/middleware';
import { runConsensusAgent } from './lib/graphs/consensus';
import { runResearchAgent } from './lib/graphs/research';
import {
    createChatSession,
    sendMessage as sendChatMessage,
    refreshSessionData,
} from './lib/graphs/qa';

const consensusInputSchema = z.object({
    stockSymbol: z.string().min(1).max(100),
    exchangeAcronym: z.string().min(1).max(100),
    forceRefresh: z.coerce.boolean().optional(),
});

export const startConsensusRun = validatedActionWithUser(
    consensusInputSchema,
    async (data, formData, user) => {
        try {
            const result = await runConsensusAgent({
                stockSymbol: data.stockSymbol,
                exchangeAcronym: data.exchangeAcronym,
                userId: user.id,
                forceRefresh: data.forceRefresh,
            });

            return {
                success: 'Consensus report generated successfully',
                runId: result.runId,
                report: result.report,
            };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Failed to generate consensus report',
                ...data,
            };
        }
    },
);

const researchInputSchema = z.object({
    stockSymbol: z.string().min(1).max(100),
    exchangeAcronym: z.string().min(1).max(100),
    query: z.string().min(10).max(1000),
    forceRefresh: z.coerce.boolean().optional(),
});

export const startResearchRun = validatedActionWithUser(
    researchInputSchema,
    async (data, formData, user) => {
        try {
            const result = await runResearchAgent({
                stockSymbol: data.stockSymbol,
                exchangeAcronym: data.exchangeAcronym,
                query: data.query,
                userId: user.id,
                forceRefresh: data.forceRefresh,
            });

            return {
                success: 'Research report generated successfully',
                runId: result.runId,
                report: result.report,
            };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Failed to generate research report',
                ...data,
            };
        }
    },
);

const createSessionSchema = z.object({
    stockSymbol: z.string().min(1).max(100).optional(),
    exchangeAcronym: z.string().min(1).max(100).optional(),
    title: z.string().max(500).optional(),
});

export const createNewChatSession = validatedActionWithUser(
    createSessionSchema,
    async (data, formData, user) => {
        try {
            const session = await createChatSession({
                userId: user.id,
                stockSymbol: data.stockSymbol,
                exchangeAcronym: data.exchangeAcronym,
                title: data.title,
            });

            return {
                success: 'Chat session created',
                sessionId: session.id,
            };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Failed to create chat session',
                ...data,
            };
        }
    },
);

const sendMessageSchema = z.object({
    sessionId: z.string(),
    content: z.string().min(1).max(10000),
    forceDataRefresh: z.coerce.boolean().optional(),
});

export const sendChatMessageAction = validatedActionWithUser(
    sendMessageSchema,
    async (data, formData, user) => {
        try {
            const result = await sendChatMessage({
                sessionId: data.sessionId,
                content: data.content,
                forceDataRefresh: data.forceDataRefresh,
                userId: user.id,
            });

            return {
                success: 'Message sent',
                userMessageId: result.userMessage.id,
                assistantMessageId: result.assistantMessage.id,
            };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Failed to send message',
                ...data,
            };
        }
    },
);

const refreshDataSchema = z.object({
    sessionId: z.string(),
});

export const refreshChatData = validatedActionWithUser(
    refreshDataSchema,
    async (data) => {
        try {
            const result = await refreshSessionData(data.sessionId);

            return {
                success: 'Data refreshed',
                snapshotId: result.snapshot.id,
            };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Failed to refresh data',
                ...data,
            };
        }
    },
);
