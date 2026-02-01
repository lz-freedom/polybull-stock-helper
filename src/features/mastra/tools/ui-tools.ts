import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const displayStockPriceTool = createTool({
    id: 'displayStockPrice',
    description: 'Display a stock price card with current price, change, and market cap.',
    inputSchema: z.object({
        symbol: z.string(),
        price: z.number(),
        change: z.number(),
        changePercent: z.number(),
        currency: z.string().optional(),
        marketCap: z.string().optional(),
        high: z.number().optional(),
        low: z.number().optional(),
    }),
    execute: async (args) => {
        return args;
    },
});

export const displayNewsTool = createTool({
    id: 'displayNews',
    description: 'Display a list of recent news articles.',
    inputSchema: z.object({
        symbol: z.string(),
        news: z.array(z.object({
            title: z.string(),
            source: z.string(),
            url: z.string(),
            publishedAt: z.string(),
        })),
    }),
    execute: async (args) => {
        return args;
    },
});

export const displayFinancialsTool = createTool({
    id: 'displayFinancials',
    description: 'Display a table of key financial metrics.',
    inputSchema: z.object({
        symbol: z.string(),
        metrics: z.array(z.object({
            label: z.string(),
            value: z.union([z.string(), z.number()]),
            period: z.string().optional(),
        })),
    }),
    execute: async (args) => {
        return args;
    },
});
