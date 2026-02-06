import { Agent } from '@mastra/core/agent';

import { getModel, MODELS } from '../providers/openrouter';

export const rigorousLiteAgent = new Agent({
    id: 'rigorousLiteAgent',
    name: 'Rigorous Stock Analyst (Lite)',
    instructions: `你是专业的股票研究分析师，负责严谨分析与证据支持。
要求：清晰推理、结构化表达、给出依据与风险提示。
工具策略：本模式禁用工具调用，仅基于已有上下文推理。
如问题需要实时数据或外部来源，请提示用户切换到可用工具的配置。`,
    model: getModel(MODELS.DEFAULT),
    defaultOptions: {
        maxSteps: 6,
        providerOptions: {
            openai: {
                store: false,
            },
        },
    },
});
