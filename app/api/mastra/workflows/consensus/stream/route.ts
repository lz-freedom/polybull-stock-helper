import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, gt } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { agentRunEvents, agentRuns, AGENT_RUN_STATUS } from '@/lib/db/schema';

function isTerminalStatus(status: string): boolean {
    return (
        status === AGENT_RUN_STATUS.COMPLETED ||
        status === AGENT_RUN_STATUS.FAILED ||
        status === AGENT_RUN_STATUS.CANCELLED
    );
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const runIdRaw = url.searchParams.get('runId');
    const cursorRaw = url.searchParams.get('cursor');

    if (!runIdRaw) {
        return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    const runId = Number(runIdRaw);
    if (!Number.isInteger(runId) || runId <= 0) {
        return NextResponse.json({ error: 'runId must be a positive integer' }, { status: 400 });
    }

    const initialCursor = cursorRaw ? Number(cursorRaw) : 0;
    if (!Number.isFinite(initialCursor) || initialCursor < 0) {
        return NextResponse.json({ error: 'cursor must be a non-negative number' }, { status: 400 });
    }

    const [run] = await db
        .select({ status: agentRuns.status })
        .from(agentRuns)
        .where(eq(agentRuns.id, runId))
        .limit(1);

    if (!run) {
        return NextResponse.json({ error: 'runId not found' }, { status: 404 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let cursor = initialCursor;

            try {
                // Poll until terminal + no new events.
                while (!request.signal.aborted) {
                    const events = await db
                        .select({
                            id: agentRunEvents.id,
                            eventId: agentRunEvents.eventId,
                            payload: agentRunEvents.payload,
                        })
                        .from(agentRunEvents)
                        .where(and(eq(agentRunEvents.agentRunId, runId), gt(agentRunEvents.id, cursor)))
                        .orderBy(asc(agentRunEvents.id))
                        .limit(100);

                    if (events.length > 0) {
                        for (const row of events) {
                            const payload = row.payload as unknown as Record<string, unknown>;
                            const line = JSON.stringify({ eventId: row.eventId, ...payload }) + '\n';
                            controller.enqueue(encoder.encode(line));
                            cursor = row.id;
                        }
                        continue;
                    }

                    const [fresh] = await db
                        .select({ status: agentRuns.status })
                        .from(agentRuns)
                        .where(eq(agentRuns.id, runId))
                        .limit(1);

                    if (!fresh) break;
                    if (isTerminalStatus(fresh.status)) break;

                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error('Mastra consensus workflow stream error:', error);
            } finally {
                controller.close();
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            'content-type': 'application/x-ndjson; charset=utf-8',
            'cache-control': 'no-cache, no-transform',
            connection: 'keep-alive',
            'x-agent-run-id': String(runId),
        },
    });
}
