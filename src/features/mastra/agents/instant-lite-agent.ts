import { Agent } from '@mastra/core/agent';

import { getModel, MODELS } from '../providers/openrouter';

export const instantLiteAgent = new Agent({
    id: 'instantLiteAgent',
    name: 'Instant Stock Assistant (Lite)',
    instructions: `你是专业的股票助手，专注于快速给出结论与要点。
要求：回答简洁、直达结论，优先用 1-2 句话总结。
工具策略：本模式禁用工具调用，只基于对话上下文给出判断。
如信息不足，请明确说明并建议用户切换到严谨分析。`,
    model: getModel(MODELS.MINIMAX_M2),
    defaultOptions: {
        maxSteps: 2,
        providerOptions: {
            openai: {
                store: false,
            },
        },
    },
});
