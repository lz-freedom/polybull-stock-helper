import { Agent } from '@mastra/core/agent';

import { getModel, MODELS } from '../providers/openrouter';
import { getStockSnapshotTool, extractFinancialsTool, searchNewsTool } from '../tools/financial-data';
import { searchExaTool, searchPerplexityTool } from '../tools/search';
import { displayStockPriceTool, displayNewsTool, displayFinancialsTool } from '../tools/ui-tools';

export const qaAgent = new Agent({
    id: 'qaAgent',
    name: 'Financial QA Agent',
    instructions: `You are a helpful financial assistant specializing in stock analysis.
You have access to real-time financial data via tools.
Follow any mode-specific system instructions. In Instant mode, avoid tool calls unless the user explicitly asks for real-time numbers or you cannot answer without fresh data.
When you do need current data about a stock, use the "getStockSnapshot" tool first (symbol/exchange).
If a user mentions a company (e.g., "Apple", "Tencent"), infer the correct Stock Symbol (e.g., "AAPL", "0700") and Exchange Acronym (e.g., "NASDAQ", "HKEX").
Refer to the tool definitions for the list of supported Exchange Acronyms.

CRITICAL: You MUST use the "display..." tools to show visual cards to the user whenever possible.
- When mentioning stock prices/performance, use "displayStockPrice".
- When mentioning news, use "displayNews".
- When discussing financial metrics, use "displayFinancials".

You also have web search tools (searchExa, searchPerplexity) when external context or sources are required.
If you use web sources, summarize and cite key sources.

Be concise but thorough. Cite specific data points from the tool outputs.
If you don't have enough information to answer confidently, invoke the necessary tools or ask for clarification.`,
    model: getModel(MODELS.DEFAULT),
    tools: {
        getStockSnapshot: getStockSnapshotTool,
        extractFinancials: extractFinancialsTool,
        searchNews: searchNewsTool,
        searchExa: searchExaTool,
        searchPerplexity: searchPerplexityTool,
        displayStockPrice: displayStockPriceTool,
        displayNews: displayNewsTool,
        displayFinancials: displayFinancialsTool,
    },
    defaultOptions: {
        maxSteps: 4,
        providerOptions: {
            openai: {
                store: false,
            },
        },
    },
});
