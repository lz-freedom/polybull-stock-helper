import { Agent } from '@mastra/core/agent';

import { getToolModel } from '../providers/openrouter';
import { getStockSnapshotTool, extractFinancialsTool, searchNewsTool } from '../tools/financial-data';
import { searchExaTool, searchPerplexityTool } from '../tools/search';
import { displayStockPriceTool, displayNewsTool, displayFinancialsTool } from '../tools/ui-tools';

export const instantAgent = new Agent({
    id: 'instantAgent',
    name: 'Instant Stock Assistant',
    instructions: `你是专业的股票助手，专注于快速给出结论与要点。
要求：回答简洁、直达结论，优先用 1-2 句话总结。
工具策略：除非用户明确要求实时数据或无法回答，否则不要调用工具。
当需要实时数据时，先调用 getStockSnapshot 获取快照，再输出结论。
如需展示价格/新闻/财务数据，必须调用 displayStockPrice / displayNews / displayFinancials。
如需外部来源，才使用 searchExa / searchPerplexity，并给出要点来源。`,
    model: getToolModel(),
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
        maxSteps: 3,
        providerOptions: {
            openai: {
                store: false,
            },
        },
    },
});
