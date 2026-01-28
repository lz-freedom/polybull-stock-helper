import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// OpenRouter 客户端配置
const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

// 支持的模型列表
export const MODELS = {
    MINIMAX_M2: 'minimax/minimax-m2-her',
    GLM_4_7: 'zhipu-ai/glm-4.7',
    SEED_1_6: 'bytedance-seed/seed-1.6',
    DEEPSEEK_V3_2: 'deepseek/deepseek-v3.2',
    QWEN3_MAX: 'qwen/qwen3-max',
    DEFAULT: 'deepseek/deepseek-v3.2',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

// 获取指定模型实例
export function getModel(modelId: ModelId = MODELS.DEFAULT) {
    return openrouter(modelId);
}

/**
 * 创建带超时的 AbortSignal
 * 用于在指定时间后自动取消请求
 * @param timeoutMs 超时时间（毫秒）
 * @returns AbortSignal 信号对象
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
}

/**
 * 从文本中提取 JSON 内容
 * 支持 markdown 代码块和原始 JSON 格式
 */
function extractJsonFromText(text: string): string {
    // 尝试匹配 markdown 代码块中的 JSON
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        return jsonMatch[1].trim();
    }
    
    // 尝试提取第一个和最后一个花括号之间的内容
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        return text.slice(firstBrace, lastBrace + 1);
    }
    
    return text;
}

/**
 * 生成结构化输出
 * 使用 Zod schema 验证并返回类型安全的结果
 * @param schema Zod 验证模式
 * @param prompt 用户提示词
 * @param options 配置选项，包括模型ID、系统提示、温度、超时和重试次数
 */
export async function generateStructuredOutput<T extends z.ZodType>(
    schema: T,
    prompt: string,
    options: {
        modelId?: ModelId;
        system?: string;
        temperature?: number;
        timeout?: number;      // 超时时间（毫秒）
        maxRetries?: number;   // 最大重试次数
    } = {},
): Promise<z.infer<T>> {
    const { 
        modelId = MODELS.DEFAULT, 
        system, 
        temperature = 0.7,
        timeout,
        maxRetries,
    } = options;

    const jsonSchema = zodToJsonSchema(schema, 'schema');
    
    // 构建结构化提示词，要求模型返回 JSON 格式
    const structuredPrompt = `${prompt}

IMPORTANT: You MUST respond with ONLY valid JSON that matches this schema:
${JSON.stringify(jsonSchema, null, 2)}

Respond with valid JSON only, no markdown code blocks, no explanations.`;

    // 构建 SDK 调用选项
    const sdkOptions: Parameters<typeof generateText>[0] = {
        model: getModel(modelId),
        prompt: structuredPrompt,
        system: system ? `${system}\n\nAlways respond with valid JSON matching the requested schema.` : 'Always respond with valid JSON matching the requested schema.',
        temperature,
    };

    // 如果指定了超时时间，创建 AbortSignal
    if (timeout !== undefined) {
        sdkOptions.abortSignal = createTimeoutSignal(timeout);
    }

    // 如果指定了重试次数，添加到选项中
    if (maxRetries !== undefined) {
        sdkOptions.maxRetries = maxRetries;
    }

    const result = await generateText(sdkOptions);

    // 解析并验证 JSON 响应
    const jsonText = extractJsonFromText(result.text);
    const parsed = JSON.parse(jsonText);
    return schema.parse(parsed);
}

/**
 * 生成文本响应
 * 返回模型生成的纯文本内容
 * @param prompt 用户提示词
 * @param options 配置选项，包括模型ID、系统提示、温度、超时和重试次数
 */
export async function generateTextResponse(
    prompt: string,
    options: {
        modelId?: ModelId;
        system?: string;
        temperature?: number;
        timeout?: number;      // 超时时间（毫秒）
        maxRetries?: number;   // 最大重试次数
    } = {},
): Promise<string> {
    const {
        modelId = MODELS.DEFAULT,
        system,
        temperature = 0.7,
        timeout,
        maxRetries,
    } = options;

    // 构建 SDK 调用选项
    const sdkOptions: Parameters<typeof generateText>[0] = {
        model: getModel(modelId),
        prompt,
        system,
        temperature,
    };

    // 如果指定了超时时间，创建 AbortSignal
    if (timeout !== undefined) {
        sdkOptions.abortSignal = createTimeoutSignal(timeout);
    }

    // 如果指定了重试次数，添加到选项中
    if (maxRetries !== undefined) {
        sdkOptions.maxRetries = maxRetries;
    }

    const result = await generateText(sdkOptions);

    return result.text;
}

/**
 * 创建文本流
 * 返回流式响应，适用于需要实时显示内容的场景
 * @param prompt 用户提示词
 * @param options 配置选项，包括模型ID、系统提示、温度、完成回调、超时和重试次数
 */
export function createTextStream(
    prompt: string,
    options: {
        modelId?: ModelId;
        system?: string;
        temperature?: number;
        onFinish?: (text: string) => void;
        timeout?: number;      // 超时时间（毫秒）
        maxRetries?: number;   // 最大重试次数
    } = {},
) {
    const {
        modelId = MODELS.DEFAULT,
        system,
        temperature = 0.7,
        onFinish,
        timeout,
        maxRetries,
    } = options;

    // 构建 SDK 调用选项
    const sdkOptions: Parameters<typeof streamText>[0] = {
        model: getModel(modelId),
        prompt,
        system,
        temperature,
        onFinish: onFinish ? ({ text }) => onFinish(text) : undefined,
    };

    // 如果指定了超时时间，创建 AbortSignal
    if (timeout !== undefined) {
        sdkOptions.abortSignal = createTimeoutSignal(timeout);
    }

    // 如果指定了重试次数，添加到选项中
    if (maxRetries !== undefined) {
        sdkOptions.maxRetries = maxRetries;
    }

    return streamText(sdkOptions);
}

/**
 * 多模型请求接口
 * 定义并行调用多个模型时的请求参数
 */
export interface MultiModelRequest {
    modelId: ModelId;
    prompt: string;
    system?: string;
    temperature?: number;
}

/**
 * 并行运行多个模型
 * 同时向多个模型发送请求，返回所有结果（包括成功和失败）
 * @param schema Zod 验证模式
 * @param requests 多个模型请求配置
 * @param options 全局选项，包括超时和重试次数（应用于所有请求）
 */
export async function runParallelModels<T extends z.ZodType>(
    schema: T,
    requests: MultiModelRequest[],
    options: {
        timeout?: number;      // 超时时间（毫秒），应用于所有请求
        maxRetries?: number;   // 最大重试次数，应用于所有请求
    } = {},
): Promise<Array<{ modelId: ModelId; result: z.infer<T>; error?: string }>> {
    const { timeout, maxRetries } = options;

    const results = await Promise.allSettled(
        requests.map(async (req) => {
            // 将全局选项与单个请求选项合并
            const result = await generateStructuredOutput(schema, req.prompt, {
                modelId: req.modelId,
                system: req.system,
                temperature: req.temperature,
                timeout,
                maxRetries,
            });
            return { modelId: req.modelId, result };
        }),
    );

    // 处理结果，区分成功和失败的请求
    return results.map((r, i) => {
        if (r.status === 'fulfilled') {
            return r.value;
        }
        return {
            modelId: requests[i].modelId,
            result: null as unknown as z.infer<T>,
            error: r.reason?.message ?? 'Unknown error',
        };
    });
}
