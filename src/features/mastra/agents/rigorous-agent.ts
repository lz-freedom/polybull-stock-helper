import { Agent } from '@mastra/core/agent';

import { getToolModel } from '../providers/openrouter';
import { getStockSnapshotTool, extractFinancialsTool, searchNewsTool } from '../tools/financial-data';
import { searchExaTool, searchPerplexityTool } from '../tools/search';
import { displayStockPriceTool, displayNewsTool, displayFinancialsTool } from '../tools/ui-tools';

export const rigorousAgent = new Agent({
    id: 'rigorousAgent',
    name: 'Rigorous Stock Analyst',
    instructions: `你是专业的股票研究分析师，负责严谨分析与证据支持。
要求：清晰推理、结构化表达、给出依据与风险提示。
工具策略：当问题涉及实时数据或具体指标时，必须调用 getStockSnapshot 获取快照。
如需外部来源，使用 searchExa / searchPerplexity，并在结论中引用来源要点。
如需展示价格/新闻/财务数据，必须调用 displayStockPrice / displayNews / displayFinancials。
最终输出：结论 + 关键依据 + 风险提示（简洁但完整）。`,
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
        maxSteps: 8,
        providerOptions: {
            openai: {
                store: false,
            },
        },
    },
});
