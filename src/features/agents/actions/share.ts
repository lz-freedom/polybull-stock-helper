'use server';

import { db } from '@/lib/db/drizzle';
import { agentRuns, reports } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function getSharedContent(shareId: string) {
    try {
        const [run] = await db
            .select()
            .from(agentRuns)
            .where(sql`${agentRuns.input}->>'shareId' = ${shareId}`)
            .limit(1);

        if (run) {
            const [report] = await db
                .select()
                .from(reports)
                .where(eq(reports.agentRunId, run.id))
                .limit(1);

            if (report) {
                return {
                    type: run.agentType as 'consensus' | 'research',
                    report: report.structuredData || { blocks: [] },
                    runId: run.id
                };
            }
        }

        return { error: 'Content not found' };
    } catch (error) {
        console.error('Error fetching shared content:', error);
        return { error: 'Failed to fetch content' };
    }
}

export async function generateShareId(runId: number) {
    const shareId = crypto.randomUUID();
    
    try {
        await db.execute(
            sql`UPDATE agent_runs SET input = input || jsonb_build_object('shareId', ${shareId}) WHERE id = ${runId}`
        );
        return { shareId };
    } catch (error) {
        console.error('Error generating share ID:', error);
        return { error: 'Failed to generate share link' };
    }
}
