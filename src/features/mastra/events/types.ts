/**
 * Mastra 事件协议类型定义
 * 用于 UI 思考面板的实时更新
 */
import { z } from 'zod';

/**
 * 阶段事件 - 标识当前执行阶段
 */
export const StageEventSchema = z.object({
    type: z.literal('stage'),
    stage: z.string(),
    progress: z.number().min(0).max(1),
    message: z.string().optional(),
    timestamp: z.number(),
});

export type StageEvent = z.infer<typeof StageEventSchema>;

/**
 * 进度事件 - 细粒度进度更新
 */
export const ProgressEventSchema = z.object({
    type: z.literal('progress'),
    stepId: z.string(),
    percent: z.number().min(0).max(100),
    message: z.string().optional(),
    timestamp: z.number(),
});

export type ProgressEvent = z.infer<typeof ProgressEventSchema>;

/**
 * 产物事件 - 中间结果（可展示/可折叠）
 */
export const ArtifactEventSchema = z.object({
    type: z.literal('artifact'),
    stepId: z.string(),
    artifactType: z.enum(['summary', 'evidence', 'comparison', 'citation', 'stance']),
    data: z.unknown(),
    timestamp: z.number(),
});

export type ArtifactEvent = z.infer<typeof ArtifactEventSchema>;

/**
 * 增量文本事件 - token 流
 */
export const DeltaEventSchema = z.object({
    type: z.literal('delta'),
    stepId: z.string(),
    chunk: z.string(),
    timestamp: z.number(),
});

export type DeltaEvent = z.infer<typeof DeltaEventSchema>;

/**
 * 分歧点事件 - 模型间观点不一致
 */
export const DivergenceEventSchema = z.object({
    type: z.literal('divergence'),
    topic: z.string(),
    views: z.array(z.object({
        analyst: z.string(),
        stance: z.enum(['bullish', 'bearish', 'neutral']),
        reasoning: z.string(),
    })),
    timestamp: z.number(),
});

export type DivergenceEvent = z.infer<typeof DivergenceEventSchema>;

/**
 * 工具调用事件
 */
export const ToolCallEventSchema = z.object({
    type: z.literal('tool-call'),
    toolName: z.string(),
    args: z.unknown(),
    callId: z.string(),
    timestamp: z.number(),
});

export type ToolCallEvent = z.infer<typeof ToolCallEventSchema>;

/**
 * 工具结果事件
 */
export const ToolResultEventSchema = z.object({
    type: z.literal('tool-result'),
    callId: z.string(),
    result: z.unknown(),
    timestamp: z.number(),
});

export type ToolResultEvent = z.infer<typeof ToolResultEventSchema>;

/**
 * 错误事件
 */
export const ErrorEventSchema = z.object({
    type: z.literal('error'),
    stepId: z.string().optional(),
    message: z.string(),
    code: z.string().optional(),
    recoverable: z.boolean(),
    timestamp: z.number(),
});

export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

/**
 * 完成事件
 */
export const CompleteEventSchema = z.object({
    type: z.literal('complete'),
    result: z.unknown(),
    duration: z.number(),
    timestamp: z.number(),
});

export type CompleteEvent = z.infer<typeof CompleteEventSchema>;

/**
 * 思考事件 - 展示当前正在进行的思考/分析
 */
export const ThinkingEventSchema = z.object({
    type: z.literal('thinking'),
    message: z.string(),
    timestamp: z.number(),
});

export type ThinkingEvent = z.infer<typeof ThinkingEventSchema>;

/**
 * 统一事件类型
 */
export const WorkflowEventSchema = z.discriminatedUnion('type', [
    StageEventSchema,
    ProgressEventSchema,
    ArtifactEventSchema,
    DeltaEventSchema,
    DivergenceEventSchema,
    ToolCallEventSchema,
    ToolResultEventSchema,
    ErrorEventSchema,
    CompleteEventSchema,
    ThinkingEventSchema,
]);

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

/**
 * 创建事件的辅助函数
 */
export function createEvent<T extends WorkflowEvent['type']>(
    type: T,
    data: Omit<Extract<WorkflowEvent, { type: T }>, 'type' | 'timestamp'>,
): Extract<WorkflowEvent, { type: T }> {
    return {
        type,
        timestamp: Date.now(),
        ...data,
    } as Extract<WorkflowEvent, { type: T }>;
}

/**
 * 序列化事件为 NDJSON 格式
 */
export function serializeEvent(event: WorkflowEvent): string {
    return JSON.stringify(event) + '\n';
}

/**
 * 解析 NDJSON 格式的事件
 */
export function parseEvent(line: string): WorkflowEvent | null {
    try {
        const parsed = JSON.parse(line);
        return WorkflowEventSchema.parse(parsed);
    } catch {
        return null;
    }
}
