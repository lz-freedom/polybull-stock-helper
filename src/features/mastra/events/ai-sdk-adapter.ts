/**
 * Mastra 自定义事件到 AI SDK Data Parts 的适配器
 *
 * 将 WorkflowEvent 转换为 AI SDK 标准 DataPart 格式
 * 以便与 Assistant-UI 兼容
 */

// DataPart 类型定义（基于 AI SDK 标准）
export type DataPart =
  | { type: 'data'; name: string; data: unknown }
  | { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
  | { type: 'tool-result'; toolCallId: string; toolName: string; output: unknown }
  | { type: 'reasoning'; reasoning: string }
  | { type: 'error'; error: string };
import type { WorkflowEvent } from './types';

/**
 * 将 WorkflowEvent 转换为 AI SDK DataPart
 */
export function toDataPart(event: WorkflowEvent): DataPart | null {
    switch (event.type) {
        case 'stage':
            return {
                type: 'data',
                name: 'mastra.stage',
                data: {
                    stage: event.stage,
                    progress: event.progress,
                    message: event.message,
                    timestamp: event.timestamp,
                },
            };

        case 'progress':
            return {
                type: 'data',
                name: 'mastra.progress',
                data: {
                    stepId: event.stepId,
                    percent: event.percent,
                    message: event.message,
                    timestamp: event.timestamp,
                },
            };

        case 'artifact':
            return {
                type: 'data',
                name: 'mastra.artifact',
                data: {
                    stepId: event.stepId,
                    artifactType: event.artifactType,
                    data: event.data,
                    timestamp: event.timestamp,
                },
            };

        case 'delta':
            // Delta 事件通常直接作为文本流处理
            // 这里转换为 data part 用于记录
            return {
                type: 'data',
                name: 'mastra.delta',
                data: {
                    stepId: event.stepId,
                    chunk: event.chunk,
                    timestamp: event.timestamp,
                },
            };

        case 'divergence':
            return {
                type: 'data',
                name: 'mastra.divergence',
                data: {
                    topic: event.topic,
                    views: event.views,
                    timestamp: event.timestamp,
                },
            };

        case 'tool-call':
            // 转换为 AI SDK 标准 tool-call part
            return {
                type: 'tool-call',
                toolCallId: event.callId,
                toolName: event.toolName,
                input: event.args,
            };

        case 'tool-result':
            // 转换为 AI SDK 标准 tool-result part
            return {
                type: 'tool-result',
                toolCallId: event.callId,
                toolName: 'tool',
                output: event.result,
            };

        case 'sources':
            return {
                type: 'data',
                name: 'mastra.sources',
                data: {
                    sources: event.sources,
                    timestamp: event.timestamp,
                },
            };

        case 'branch-status':
            return {
                type: 'data',
                name: 'mastra.branch-status',
                data: {
                    branches: event.branches,
                    timestamp: event.timestamp,
                },
            };

        case 'error':
            // 转换为 AI SDK 标准 error part
            return {
                type: 'error',
                error: event.message,
            };

        case 'complete':
            return {
                type: 'data',
                name: 'mastra.complete',
                data: {
                    result: event.result,
                    duration: event.duration,
                    timestamp: event.timestamp,
                },
            };

        case 'thinking':
            return {
                type: 'data',
                name: 'mastra.thinking',
                data: {
                    message: event.message,
                    timestamp: event.timestamp,
                },
            };
        case 'round':
            return {
                type: 'data',
                name: 'mastra.round',
                data: {
                    round: event.round,
                    totalRounds: event.totalRounds,
                    speaker: event.speaker,
                    agenda: event.agenda,
                    timestamp: event.timestamp,
                },
            };

        case 'step-summary':
            return {
                type: 'data',
                name: 'mastra.step-summary',
                data: {
                    stepId: event.stepId,
                    summary: event.summary,
                    timestamp: event.timestamp,
                },
            };

        case 'decision':
            return {
                type: 'data',
                name: 'mastra.decision',
                data: {
                    decision: event.decision,
                    rationale: event.rationale,
                    timestamp: event.timestamp,
                },
            };

        case 'report':
            return {
                type: 'data',
                name: 'mastra.report',
                data: {
                    reportId: event.reportId,
                    reportType: event.reportType,
                    report: event.report,
                    runId: event.runId,
                    timestamp: event.timestamp,
                },
            };

        default:
            // 未知事件类型，返回 null
            return null;
    }
}

/**
 * 批量转换 WorkflowEvent 数组为 DataPart 数组
 */
export function toDataParts(events: WorkflowEvent[]): DataPart[] {
    return events.map(toDataPart).filter((part): part is DataPart => part !== null);
}

/**
 * 创建 EventSource 流（Server-Sent Events 格式）
 */
export function createEventSourceStream(events: WorkflowEvent[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
        start(controller) {
            for (const event of events) {
                const part = toDataPart(event);
                if (part) {
                    const data = `data: ${JSON.stringify(part)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                }
            }
            controller.close();
        },
    });
}

/**
 * 将 NDJSON 行解析为 DataPart
 */
export function parseDataPartFromNDJSON(line: string): DataPart | null {
    try {
        const parsed = JSON.parse(line);
        // 如果已经是 DataPart 格式，直接返回
        if (parsed.type === 'data' || parsed.type === 'tool-call' ||
            parsed.type === 'tool-result' || parsed.type === 'error' ||
            parsed.type === 'reasoning') {
            return parsed as DataPart;
        }
        // 如果是旧的 WorkflowEvent 格式，转换
        if (parsed.type && typeof parsed.type === 'string') {
            return toDataPart(parsed as WorkflowEvent);
        }
        return null;
    } catch {
        return null;
    }
}
