import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

export const MODELS = {
    MINIMAX_M2: 'minimax/minimax-m2-her',
    GLM_4_7: 'zhipu-ai/glm-4.7',
    SEED_1_6: 'bytedance-seed/seed-1.6',
    DEEPSEEK_V3_2: 'deepseek/deepseek-v3.2',
    QWEN3_MAX: 'qwen/qwen3-max',
    DEFAULT: 'deepseek/deepseek-v3.2',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export function getModel(modelId: ModelId = MODELS.DEFAULT) {
    return openrouter(modelId);
}

function extractJsonFromText(text: string): string {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        return jsonMatch[1].trim();
    }
    
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        return text.slice(firstBrace, lastBrace + 1);
    }
    
    return text;
}

export async function generateStructuredOutput<T extends z.ZodType>(
    schema: T,
    prompt: string,
    options: {
        modelId?: ModelId;
        system?: string;
        temperature?: number;
    } = {},
): Promise<z.infer<T>> {
    const { modelId = MODELS.DEFAULT, system, temperature = 0.7 } = options;

    const jsonSchema = zodToJsonSchema(schema, 'schema');
    
    const structuredPrompt = `${prompt}

IMPORTANT: You MUST respond with ONLY valid JSON that matches this schema:
${JSON.stringify(jsonSchema, null, 2)}

Respond with valid JSON only, no markdown code blocks, no explanations.`;

    const result = await generateText({
        model: getModel(modelId),
        prompt: structuredPrompt,
        system: system ? `${system}\n\nAlways respond with valid JSON matching the requested schema.` : 'Always respond with valid JSON matching the requested schema.',
        temperature,
    });

    const jsonText = extractJsonFromText(result.text);
    const parsed = JSON.parse(jsonText);
    return schema.parse(parsed);
}

export async function generateTextResponse(
    prompt: string,
    options: {
        modelId?: ModelId;
        system?: string;
        temperature?: number;
    } = {},
): Promise<string> {
    const {
        modelId = MODELS.DEFAULT,
        system,
        temperature = 0.7,
    } = options;

    const result = await generateText({
        model: getModel(modelId),
        prompt,
        system,
        temperature,
    });

    return result.text;
}

export function createTextStream(
    prompt: string,
    options: {
        modelId?: ModelId;
        system?: string;
        temperature?: number;
        onFinish?: (text: string) => void;
    } = {},
) {
    const {
        modelId = MODELS.DEFAULT,
        system,
        temperature = 0.7,
        onFinish,
    } = options;

    return streamText({
        model: getModel(modelId),
        prompt,
        system,
        temperature,
        onFinish: onFinish ? ({ text }) => onFinish(text) : undefined,
    });
}

export interface MultiModelRequest {
    modelId: ModelId;
    prompt: string;
    system?: string;
    temperature?: number;
}

export async function runParallelModels<T extends z.ZodType>(
    schema: T,
    requests: MultiModelRequest[],
): Promise<Array<{ modelId: ModelId; result: z.infer<T>; error?: string }>> {
    const results = await Promise.allSettled(
        requests.map(async (req) => {
            const result = await generateStructuredOutput(schema, req.prompt, {
                modelId: req.modelId,
                system: req.system,
                temperature: req.temperature,
            });
            return { modelId: req.modelId, result };
        }),
    );

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
