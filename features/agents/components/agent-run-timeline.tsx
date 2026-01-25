'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Loader2, XCircle, Clock } from 'lucide-react';

interface Step {
    stepName: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
}

interface AgentRunTimelineProps {
    runId: number;
    agentType: 'consensus' | 'research' | 'qa';
    onComplete?: () => void;
    className?: string;
}

const STEP_LABELS: Record<string, string> = {
    fetch_data: 'Fetching stock data',
    parallel_analysis: 'Running model analyses',
    synthesize_consensus: 'Synthesizing consensus',
    create_plan: 'Creating research plan',
    synthesize_report: 'Generating final report',
    research_fundamental_analyst: 'Fundamental analysis',
    research_technical_analyst: 'Technical analysis',
    research_industry_expert: 'Industry analysis',
    research_risk_analyst: 'Risk analysis',
};

function getStepLabel(stepName: string): string {
    return STEP_LABELS[stepName] ?? stepName.replace(/_/g, ' ');
}

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'completed':
            return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        case 'running':
            return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
        case 'failed':
            return <XCircle className="h-5 w-5 text-red-500" />;
        case 'skipped':
            return <Circle className="h-5 w-5 text-gray-400" />;
        default:
            return <Clock className="h-5 w-5 text-gray-300" />;
    }
}

export function AgentRunTimeline({
    runId,
    agentType,
    onComplete,
    className,
}: AgentRunTimelineProps) {
    const [steps, setSteps] = useState<Step[]>([]);
    const [runStatus, setRunStatus] = useState<string>('pending');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        async function fetchStatus() {
            try {
                const endpoint =
                    agentType === 'research'
                        ? `/api/agents/research?runId=${runId}`
                        : `/api/agents/consensus?runId=${runId}`;

                const response = await fetch(endpoint);
                const data = await response.json();

                if (data.success) {
                    setSteps(data.steps);
                    setRunStatus(data.run.status);

                    if (
                        data.run.status === 'completed' ||
                        data.run.status === 'failed'
                    ) {
                        clearInterval(intervalId);
                        if (data.run.status === 'completed') {
                            onComplete?.();
                        }
                        if (data.run.status === 'failed' && data.run.error) {
                            setError(data.run.error);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch run status:', err);
            }
        }

        fetchStatus();
        intervalId = setInterval(fetchStatus, 2000);

        return () => clearInterval(intervalId);
    }, [runId, agentType, onComplete]);

    const completedSteps = steps.filter((s) => s.status === 'completed').length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                    Progress
                </span>
                <span className="text-gray-500">
                    {completedSteps}/{totalSteps} steps
                </span>
            </div>

            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={cn(
                        'h-full transition-all duration-500',
                        runStatus === 'failed' ? 'bg-red-500' : 'bg-blue-500',
                    )}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="space-y-3">
                {steps.map((step, index) => (
                    <div
                        key={step.stepName}
                        className={cn(
                            'flex items-center gap-3 p-3 rounded-lg transition-colors',
                            step.status === 'running' &&
                                'bg-blue-50 dark:bg-blue-900/20',
                            step.status === 'completed' &&
                                'bg-green-50 dark:bg-green-900/20',
                            step.status === 'failed' &&
                                'bg-red-50 dark:bg-red-900/20',
                        )}
                    >
                        <div className="flex-shrink-0">
                            <StatusIcon status={step.status} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {getStepLabel(step.stepName)}
                            </p>
                            {step.startedAt && (
                                <p className="text-xs text-gray-500">
                                    {step.completedAt
                                        ? `Completed in ${Math.round((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000)}s`
                                        : 'In progress...'}
                                </p>
                            )}
                        </div>
                        <div className="flex-shrink-0 text-xs text-gray-400">
                            Step {index + 1}
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                        Error: {error}
                    </p>
                </div>
            )}

            {runStatus === 'completed' && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        ✓ Analysis complete
                    </p>
                </div>
            )}
        </div>
    );
}
