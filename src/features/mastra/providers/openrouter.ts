/**
 * OpenRouter LLM Provider for Mastra
 * 复用现有 MODELS 配置，适配 Mastra Model 接口
 */
import { createOpenAI } from '@ai-sdk/openai';

// OpenRouter 客户端配置
const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    console.warn('OPENROUTER_API_KEY is missing. AI features may fail.');
}

const openrouter = createOpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL: 'https://openrouter.ai/api/v1',
});

/**
 * 可用模型配置
 * 复用现有 llm-client.ts 中的模型定义
 */
export const MODELS = {
    // 推理模型
    MINIMAX_M2: 'minimax/minimax-m2-her',
    GLM_4_7: 'zhipu-ai/glm-4.7',
    SEED_1_6: 'bytedance-seed/seed-1.6',
    DEEPSEEK_V3_2: 'deepseek/deepseek-v3.2',
    QWEN3_MAX: 'qwen/qwen3-max',
    // 默认模型
    DEFAULT: 'deepseek/deepseek-v3.2',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

/**
 * 获取 Mastra 兼容的模型实例
 * @param modelId - 模型 ID
 * @returns AI SDK 兼容的模型实例
 */
export function getModel(modelId: ModelId = MODELS.DEFAULT) {
    return openrouter.chat(modelId);
}

/**
 * 多模型配置（用于并行分析）
 * 每个分析师使用不同的模型以获得多样化视角
 */
export const ANALYST_MODELS = {
    fundamental: MODELS.QWEN3_MAX,      // 基本面分析
    technical: MODELS.DEEPSEEK_V3_2,    // 技术分析
    sentiment: MODELS.SEED_1_6,         // 情绪分析
    risk: MODELS.GLM_4_7,               // 风险分析
    macro: MODELS.MINIMAX_M2,           // 宏观分析
    synthesizer: MODELS.DEEPSEEK_V3_2,  // 汇总器
} as const;
