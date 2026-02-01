import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { asc, eq } from 'drizzle-orm';

import type { WorkflowEvent } from '@/features/mastra/events/types';
import { db } from '@/lib/db/drizzle';
import { agentRunEvents } from '@/lib/db/schema';

const DEFAULT_MAX_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clampSpeed = (value: number) => {
    if (!Number.isFinite(value)) return 1;
    if (value <= 0) return 0;
    return Math.min(value, 10);
};

export async function createWorkflowReplayResponse(params: {
    runId: number;
    speed?: number;
    maxDelayMs?: number;
}) {
    const events = await db
        .select({
            eventId: agentRunEvents.eventId,
            payload: agentRunEvents.payload,
            createdAt: agentRunEvents.createdAt,
        })
        .from(agentRunEvents)
        .where(eq(agentRunEvents.agentRunId, params.runId))
        .orderBy(asc(agentRunEvents.id));

    const speed = clampSpeed(params.speed ?? 1);
    const maxDelayMs = params.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            let lastTimestamp: number | null = null;

            for (const row of events) {
                const payload = row.payload as WorkflowEvent;
                const payloadType =
                    payload && typeof payload.type === 'string' ? payload.type : 'event';
                const timestamp =
                    payload && typeof payload.timestamp === 'number'
                        ? payload.timestamp
                        : row.createdAt?.getTime() ?? Date.now();

                if (lastTimestamp !== null && speed > 0) {
                    const delta = Math.max(timestamp - lastTimestamp, 0);
                    const delay = Math.min(delta / speed, maxDelayMs);
                    if (delay > 0) await sleep(delay);
                }

                lastTimestamp = timestamp;

                writer.write({
                    type: `data-${payloadType}`,
                    id: row.eventId,
                    data: payload,
                });
            }
        },
    });

    return createUIMessageStreamResponse({
        stream,
        headers: {
            'cache-control': 'no-cache, no-transform',
            'x-agent-run-id': String(params.runId),
        },
    });
}
