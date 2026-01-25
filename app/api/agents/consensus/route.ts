import { NextRequest, NextResponse } from 'next/server';
import { runConsensusAgent, getConsensusRunStatus } from '@/features/agents/lib/graphs/consensus';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const user = await getUser();
        const body = await request.json();

        const { stockSymbol, exchangeAcronym, forceRefresh } = body;

        if (!stockSymbol || !exchangeAcronym) {
            return NextResponse.json(
                { error: 'stockSymbol and exchangeAcronym are required' },
                { status: 400 },
            );
        }

        const result = await runConsensusAgent({
            stockSymbol,
            exchangeAcronym,
            userId: user?.id,
            forceRefresh: forceRefresh ?? false,
        });

        return NextResponse.json({
            success: true,
            runId: result.runId,
            report: result.report,
            modelAnalyses: result.modelAnalyses,
        });
    } catch (error) {
        console.error('Consensus agent error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to run consensus agent' },
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

        const status = await getConsensusRunStatus(parseInt(runId, 10));

        return NextResponse.json({
            success: true,
            ...status,
        });
    } catch (error) {
        console.error('Get consensus status error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get status' },
            { status: 500 },
        );
    }
}
