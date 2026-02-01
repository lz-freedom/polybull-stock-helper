import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { searchExa, searchPerplexity } from '@/features/agents/lib/services/context-pack';

export const searchExaTool = createTool({
    id: 'searchExa',
    description: 'Search the web with Exa and return normalized sources',
    inputSchema: z.object({
        query: z.string().min(1),
        numResults: z.number().int().min(1).max(20).optional(),
    }),
    execute: async (input) => {
        const result = await searchExa(input.query, { numResults: input.numResults });
        if (!result) return { sources: [] };
        return {
            requestId: result.requestId,
            context: result.context,
            sources: result.sources,
        };
    },
});

export const searchPerplexityTool = createTool({
    id: 'searchPerplexity',
    description: 'Search the web with Perplexity and return normalized sources',
    inputSchema: z.object({
        query: z.string().min(1),
        maxResults: z.number().int().min(1).max(20).optional(),
    }),
    execute: async (input) => {
        const result = await searchPerplexity(input.query, { maxResults: input.maxResults });
        if (!result) return { sources: [] };
        return {
            id: result.id,
            sources: result.sources,
        };
    },
});
