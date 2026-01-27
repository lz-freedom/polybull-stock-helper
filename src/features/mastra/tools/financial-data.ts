import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
    getOrFetchSnapshot,
    extractStockInfo,
    extractLatestFinancials,
    extractRecentNews,
} from '@/features/agents/lib/services/facts-snapshot-service';

export const getStockSnapshotTool = createTool({
    id: 'getStockSnapshot',
    description: 'Get comprehensive stock data including financials, news, and company info',
    inputSchema: z.object({
        stockSymbol: z.string().describe('Stock ticker symbol (e.g., AAPL, TSLA)'),
        exchangeAcronym: z.string().describe('Exchange acronym (e.g., NASDAQ, NYSE)'),
        forceRefresh: z.boolean().optional().describe('Force refresh data from API'),
    }),
    execute: async (input) => {
        const snapshot = await getOrFetchSnapshot(
            input.stockSymbol,
            input.exchangeAcronym,
            { forceRefresh: input.forceRefresh },
        );

        const stockInfo = extractStockInfo(snapshot);
        const financials = extractLatestFinancials(snapshot);
        const news = extractRecentNews(snapshot, 5);

        return {
            stockInfo,
            financials,
            recentNews: news,
            fetchedAt: snapshot.fetchedAt,
        };
    },
});

export const extractFinancialsTool = createTool({
    id: 'extractFinancials',
    description: 'Extract key financial metrics from stock data',
    inputSchema: z.object({
        stockSymbol: z.string(),
        exchangeAcronym: z.string(),
    }),
    execute: async (input) => {
        const snapshot = await getOrFetchSnapshot(
            input.stockSymbol,
            input.exchangeAcronym,
        );

        const financials = extractLatestFinancials(snapshot);
        const stockInfo = extractStockInfo(snapshot);

        return {
            symbol: stockInfo.symbol,
            name: stockInfo.name,
            sector: stockInfo.sector,
            industry: stockInfo.industry,
            marketCap: stockInfo.marketCap,
            ...financials,
        };
    },
});

export const searchNewsTool = createTool({
    id: 'searchNews',
    description: 'Search for recent news about a stock',
    inputSchema: z.object({
        stockSymbol: z.string(),
        exchangeAcronym: z.string(),
        limit: z.number().optional().default(10),
    }),
    execute: async (input) => {
        const snapshot = await getOrFetchSnapshot(
            input.stockSymbol,
            input.exchangeAcronym,
        );

        const news = extractRecentNews(snapshot, input.limit);

        return {
            count: news.length,
            articles: news.map(n => ({
                title: n.title,
                publisher: n.publisher,
                link: n.link,
                publishedAt: n.publishedAt,
            })),
        };
    },
});
