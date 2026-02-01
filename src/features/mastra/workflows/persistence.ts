import { randomUUID } from 'crypto';
import { eq, sql } from 'drizzle-orm';

import type { WorkflowEvent } from '@/features/mastra/events/types';
import { db } from '@/lib/db/drizzle';
import {
    agentRunEvents,
    agentRuns,
    agentRunSteps,
    AGENT_RUN_STATUS,
    AGENT_STEP_STATUS,
    usageCounters,
    usageLogs,
    type AgentRunStatus,
    type AgentStepStatus,
} from '@/lib/db/schema';

export async function updateAgentRunStatus(params: {
    runDbId: number;
    status: AgentRunStatus;
    output?: unknown;
    error?: string;
    factsSnapshotId?: number;
}) {
    const now = new Date();

    await db
        .update(agentRuns)
        .set({
            status: params.status,
            ...(params.output !== undefined
                ? { output: params.output as Record<string, unknown> }
                : {}),
            ...(params.error !== undefined ? { error: params.error } : {}),
            ...(params.factsSnapshotId !== undefined
                ? { factsSnapshotId: params.factsSnapshotId }
                : {}),
            updatedAt: now,
            ...(params.status === AGENT_RUN_STATUS.RUNNING
                ? { startedAt: now }
                : {}),
            ...(params.status === AGENT_RUN_STATUS.COMPLETED ||
            params.status === AGENT_RUN_STATUS.FAILED ||
            params.status === AGENT_RUN_STATUS.CANCELLED
                ? { completedAt: now }
                : {}),
        })
        .where(eq(agentRuns.id, params.runDbId));
}

export async function updateAgentRunStepStatus(params: {
    stepDbId: number;
    status: AgentStepStatus;
    output?: unknown;
    error?: string;
    metadata?: unknown;
}) {
    const now = new Date();

    await db
        .update(agentRunSteps)
        .set({
            status: params.status,
            ...(params.output !== undefined
                ? { output: params.output as Record<string, unknown> }
                : {}),
            ...(params.error !== undefined ? { error: params.error } : {}),
            ...(params.metadata !== undefined
                ? { metadata: params.metadata as Record<string, unknown> }
                : {}),
            ...(params.status === AGENT_STEP_STATUS.RUNNING
                ? { startedAt: now }
                : {}),
            ...(params.status === AGENT_STEP_STATUS.COMPLETED ||
            params.status === AGENT_STEP_STATUS.FAILED ||
            params.status === AGENT_STEP_STATUS.SKIPPED
                ? { completedAt: now }
                : {}),
        })
        .where(eq(agentRunSteps.id, params.stepDbId));
}

export function createPersistedWorkflowEventEmitter(params: {
    runDbId: number;
    emitter?: (event: WorkflowEvent) => Promise<void>;
}) {
    return async (event: WorkflowEvent) => {
        try {
            await db.insert(agentRunEvents).values({
                agentRunId: params.runDbId,
                eventId: randomUUID(),
                type: event.type,
                payload: event as unknown as Record<string, unknown>,
            });
        } catch (error) {
            console.error('Failed to persist workflow event:', error);
        }

        if (params.emitter) {
            await params.emitter(event);
        }
    };
}

export async function bumpUsageCounter(params: {
    userId: number | null | undefined;
    mode: string;
    periodKey: string;
    delta: number;
    limit: number;
}) {
    if (!params.userId) return;
    const now = new Date();

    await db
        .insert(usageCounters)
        .values({
            userId: params.userId,
            mode: params.mode,
            used: params.delta,
            limit: params.limit,
            periodKey: params.periodKey,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: [
                usageCounters.userId,
                usageCounters.mode,
                usageCounters.periodKey,
            ],
            set: {
                used: sql`${usageCounters.used} + ${params.delta}`,
                limit: params.limit,
                updatedAt: now,
            },
        });
}

export async function insertUsageLog(params: {
    userId: number | null | undefined;
    mode: string;
    runId?: number | null;
    sessionId?: string | null;
    delta: number;
    reason?: string;
}) {
    if (!params.userId) return;

    await db.insert(usageLogs).values({
        userId: params.userId,
        mode: params.mode,
        runId: params.runId ?? null,
        sessionId: params.sessionId ?? null,
        delta: params.delta,
        reason: params.reason,
    });
}
