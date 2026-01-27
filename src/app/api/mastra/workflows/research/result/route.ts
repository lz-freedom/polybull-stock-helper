import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { agentRunSteps, agentRuns, reports, reportSections } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const runIdRaw = url.searchParams.get('runId');

    if (!runIdRaw) {
        return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    const runId = Number(runIdRaw);
    if (!Number.isInteger(runId) || runId <= 0) {
        return NextResponse.json({ error: 'runId must be a positive integer' }, { status: 400 });
    }

    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1);
    if (!run) {
        return NextResponse.json({ error: 'runId not found' }, { status: 404 });
    }

    const steps = await db
        .select()
        .from(agentRunSteps)
        .where(eq(agentRunSteps.agentRunId, runId))
        .orderBy(asc(agentRunSteps.stepOrder));

    const [report] = await db
        .select()
        .from(reports)
        .where(and(eq(reports.agentRunId, runId), eq(reports.reportType, 'research')))
        .limit(1);

    const sections = report
        ? await db
              .select()
              .from(reportSections)
              .where(eq(reportSections.reportId, report.id))
              .orderBy(asc(reportSections.sectionOrder))
        : [];

    return NextResponse.json({
        run,
        steps,
        report: report ? { ...report, sections } : null,
        status: run.status,
    });
}
