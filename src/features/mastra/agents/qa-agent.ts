import { Agent } from '@mastra/core/agent';

import { getModel, MODELS } from '../providers/openrouter';
import { getStockSnapshotTool, extractFinancialsTool, searchNewsTool } from '../tools/financial-data';

export const qaAgent = new Agent({
    id: 'qaAgent',
    name: 'Financial QA Agent',
    instructions: `You are a helpful financial assistant specializing in stock analysis.
You have access to real-time financial data and can provide insights based on facts.
When a user mentions a company (e.g., "Apple", "Tencent"), you MUST infer the correct Stock Symbol (e.g., "AAPL", "0700") and Exchange Acronym (e.g., "NASDAQ", "HKEX").
Refer to the tool definitions for the list of supported Exchange Acronyms.
Be concise but thorough. Cite specific data points when available.
If you don't have enough information to answer confidently, say so.`,
    model: getModel(MODELS.DEFAULT),
    tools: {
        getStockSnapshot: getStockSnapshotTool,
        extractFinancials: extractFinancialsTool,
        searchNews: searchNewsTool,
    },
});
