import { NextRequest, NextResponse } from 'next/server';
import { runResearchAgent, getResearchRunStatus } from '@/features/agents/lib/graphs/research';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const user = await getUser();
        const body = await request.json();

        const { stockSymbol, exchangeAcronym, query, forceRefresh } = body;

        if (!stockSymbol || !exchangeAcronym || !query) {
            return NextResponse.json(
                { error: 'stockSymbol, exchangeAcronym, and query are required' },
                { status: 400 },
            );
        }

        const result = await runResearchAgent({
            stockSymbol,
            exchangeAcronym,
            query,
            userId: user?.id,
            forceRefresh: forceRefresh ?? false,
        });

        return NextResponse.json({
            success: true,
            runId: result.runId,
            report: result.report,
            plan: result.plan,
            findings: result.findings,
        });
    } catch (error) {
        console.error('Research agent error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to run research agent' },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const runId = searchParams.get('runId');

        if (!runId) {
            return NextResponse.json(
                { error: 'runId is required' },
                { status: 400 },
            );
        }

        const status = await getResearchRunStatus(parseInt(runId, 10));

        return NextResponse.json({
            success: true,
            ...status,
        });
    } catch (error) {
        console.error('Get research status error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get status' },
            { status: 500 },
        );
    }
}
