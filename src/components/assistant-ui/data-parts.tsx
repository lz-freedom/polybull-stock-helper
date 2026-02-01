'use client';

import type { ReactNode } from 'react';
import type { DataMessagePart } from '@assistant-ui/react';
import { cn } from '@/lib/utils';

type StageData = {
    stage?: string;
    progress?: number;
    message?: string;
    timestamp?: number;
};

type ProgressData = {
    stepId?: string;
    percent?: number;
    message?: string;
    timestamp?: number;
};

type ThinkingData = {
    message?: string;
    timestamp?: number;
};

type ToolCallData = {
    toolName?: string;
    callId?: string;
    args?: unknown;
    timestamp?: number;
};

type ToolResultData = {
    callId?: string;
    result?: unknown;
    timestamp?: number;
};

type ArtifactData = {
    stepId?: string;
    artifactType?: string;
    data?: unknown;
    timestamp?: number;
};

type DivergenceData = {
    topic?: string;
    views?: { analyst?: string; stance?: string; reasoning?: string }[];
    timestamp?: number;
};

type ErrorData = {
    stepId?: string;
    message?: string;
    code?: string;
    recoverable?: boolean;
    timestamp?: number;
};

type CompleteData = {
    result?: unknown;
    duration?: number;
    timestamp?: number;
};

type RoundData = {
    round?: number;
    totalRounds?: number;
    speaker?: string;
    agenda?: string;
    timestamp?: number;
};

type SourcesData = {
    sources?: { title?: string; url?: string; sourceType?: string }[];
    timestamp?: number;
};

type BranchStatusData = {
    branches?: { id?: string; status?: string; durationMs?: number }[];
    timestamp?: number;
};

type StepSummaryData = {
    summary?: string;
    stepId?: string;
    timestamp?: number;
};

type DecisionData = {
    decision?: string;
    rationale?: string;
    timestamp?: number;
};

type ReportData = {
    report?: unknown;
    reportId?: string | number;
    timestamp?: number;
};

function formatTimestamp(timestamp?: number) {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function JsonBlock({ value }: { value: unknown }) {
    if (value === undefined) return null;
    const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return (
        <pre className="whitespace-pre-wrap break-words rounded-2xl bg-slate-950/60 p-3 text-xs text-slate-200 shadow-inner shadow-black/40">
            {content}
        </pre>
    );
}

function DataEventCard({
    title,
    timestamp,
    children,
}: {
    title: string;
    timestamp?: number;
    children: ReactNode;
}) {
    const timeLabel = formatTimestamp(timestamp);
    return (
        <div className="rounded-2xl border border-[#e2e8f0] bg-white/90 px-3 py-3 text-xs text-[#0f172a] shadow-sm">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                <span>{title}</span>
                {timeLabel ? <span className="text-[10px] text-slate-500">{timeLabel}</span> : null}
            </div>
            {children}
        </div>
    );
}

function StageDataPart({ part }: { part: DataMessagePart<StageData> }) {
    const progress = typeof part.data?.progress === 'number' ? part.data.progress : undefined;
    const percent = progress !== undefined ? Math.round(progress * 100) : undefined;
    return (
        <DataEventCard title={`Stage: ${part.data?.stage ?? 'unknown'}`} timestamp={part.data?.timestamp}>
            {part.data?.message ? <p className="text-sm text-[#0f172a]">{part.data.message}</p> : null}
            {percent !== undefined && (
                <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                            className="h-1.5 rounded-full bg-[#0ea5e9]"
                            style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                        />
                    </div>
                    <div className="mt-1 text-[11px] text-[#475569]">{percent}%</div>
                </div>
            )}
        </DataEventCard>
    );
}

function ProgressDataPart({ part }: { part: DataMessagePart<ProgressData> }) {
    return (
        <DataEventCard title={`Progress: ${part.data?.stepId ?? 'step'}`} timestamp={part.data?.timestamp}>
            <div className="flex items-center justify-between">
                <span className="text-[#0f172a]">{part.data?.message ?? 'Updating progress'}</span>
                {typeof part.data?.percent === 'number' ? (
                    <span className="text-[11px] text-[#475569]">{part.data.percent}%</span>
                ) : null}
            </div>
        </DataEventCard>
    );
}

function ThinkingDataPart({ part }: { part: DataMessagePart<ThinkingData> }) {
    return (
        <DataEventCard title="Thinking" timestamp={part.data?.timestamp}>
            <p className="text-sm text-[#0f172a]">{part.data?.message ?? 'Working...'}</p>
        </DataEventCard>
    );
}

function ToolCallDataPart({ part }: { part: DataMessagePart<ToolCallData> }) {
    return (
        <DataEventCard title={`Tool call: ${part.data?.toolName ?? 'tool'}`} timestamp={part.data?.timestamp}>
            <div className="mb-2 text-[11px] text-[#475569]">Call ID: {part.data?.callId ?? 'n/a'}</div>
            <JsonBlock value={part.data?.args ?? {}} />
        </DataEventCard>
    );
}

function ToolResultDataPart({ part }: { part: DataMessagePart<ToolResultData> }) {
    return (
        <DataEventCard title="Tool result" timestamp={part.data?.timestamp}>
            <div className="mb-2 text-[11px] text-[#475569]">Call ID: {part.data?.callId ?? 'n/a'}</div>
            <JsonBlock value={part.data?.result ?? {}} />
        </DataEventCard>
    );
}

function ArtifactDataPart({ part }: { part: DataMessagePart<ArtifactData> }) {
    return (
        <DataEventCard title={`Artifact: ${part.data?.artifactType ?? 'artifact'}`} timestamp={part.data?.timestamp}>
            <div className="mb-2 text-[11px] text-[#475569]">Step: {part.data?.stepId ?? 'n/a'}</div>
            <JsonBlock value={part.data?.data ?? {}} />
        </DataEventCard>
    );
}

function DivergenceDataPart({ part }: { part: DataMessagePart<DivergenceData> }) {
    const views = part.data?.views ?? [];
    return (
        <DataEventCard title={`Divergence: ${part.data?.topic ?? 'topic'}`} timestamp={part.data?.timestamp}>
            <div className="space-y-2">
                {views.length === 0 && <p>No divergence details.</p>}
                {views.map((view, index) => (
                    <div
                        key={`${view.analyst ?? 'analyst'}-${index}`}
                        className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-2"
                    >
                        <div className="flex items-center justify-between text-[11px] text-[#475569]">
                            <span>{view.analyst ?? `Analyst ${index + 1}`}</span>
                            <span>{view.stance ?? 'unknown'}</span>
                        </div>
                        <p className="mt-1 text-sm text-[#0f172a]">{view.reasoning ?? ''}</p>
                    </div>
                ))}
            </div>
        </DataEventCard>
    );
}

function ErrorDataPart({ part }: { part: DataMessagePart<ErrorData> }) {
    return (
        <DataEventCard title="Error" timestamp={part.data?.timestamp}>
            <p className="text-sm text-foreground">{part.data?.message ?? 'Unexpected error'}</p>
            <div className="mt-2 text-[11px] text-muted-foreground">
                {part.data?.code ? `Code: ${part.data.code}` : null}
                {part.data?.recoverable !== undefined ? ` • Recoverable: ${part.data.recoverable ? 'yes' : 'no'}` : null}
            </div>
        </DataEventCard>
    );
}

function CompleteDataPart({ part }: { part: DataMessagePart<CompleteData> }) {
    return (
        <DataEventCard title="Completed" timestamp={part.data?.timestamp}>
            {typeof part.data?.duration === 'number' ? (
                <div className="mb-2 text-[11px] text-muted-foreground">
                    Duration: {Math.round(part.data.duration / 1000)}s
                </div>
            ) : null}
            <JsonBlock value={part.data?.result ?? {}} />
        </DataEventCard>
    );
}

function RoundDataPart({ part }: { part: DataMessagePart<RoundData> }) {
    const round = part.data?.round ?? 0;
    const totalRounds = part.data?.totalRounds;
    return (
        <DataEventCard title={`Round ${round}${totalRounds ? ` / ${totalRounds}` : ''}`} timestamp={part.data?.timestamp}>
            {part.data?.agenda ? <p className="text-sm text-foreground">{part.data.agenda}</p> : null}
            {part.data?.speaker ? (
                <div className="mt-2 text-[11px] text-muted-foreground">Speaker: {part.data.speaker}</div>
            ) : null}
        </DataEventCard>
    );
}

function SourcesDataPart({ part }: { part: DataMessagePart<SourcesData | SourcesData['sources']> }) {
    const sources = Array.isArray(part.data) ? part.data : part.data?.sources ?? [];
    return (
        <DataEventCard title="Sources" timestamp={!Array.isArray(part.data) ? part.data?.timestamp : undefined}>
            <div className="space-y-2">
                {sources.length === 0 && <p>No sources yet.</p>}
                {sources.map((source, index) => (
                    <div key={`${source.url ?? source.title ?? 'source'}-${index}`} className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-2">
                        <div className="text-sm text-[#0f172a]">{source.title ?? source.url ?? 'Untitled source'}</div>
                        {source.url ? (
                            <div className="text-[11px] text-[#475569]">{source.url}</div>
                        ) : null}
                    </div>
                ))}
            </div>
        </DataEventCard>
    );
}

function BranchStatusDataPart({ part }: { part: DataMessagePart<BranchStatusData> }) {
    const branches = part.data?.branches ?? [];
    return (
        <DataEventCard title="Branch Status" timestamp={part.data?.timestamp}>
            <div className="space-y-2">
                {branches.length === 0 && <p>No branch updates.</p>}
                {branches.map((branch, index) => (
                    <div
                        key={`${branch.id ?? 'branch'}-${index}`}
                        className="flex items-center justify-between rounded-md border border-muted bg-background/80 px-2 py-1"
                    >
                        <span className="text-sm text-foreground">{branch.id ?? `Branch ${index + 1}`}</span>
                        <span className="text-[11px] text-muted-foreground">
                            {branch.status ?? 'unknown'}
                            {typeof branch.durationMs === 'number' ? ` • ${Math.round(branch.durationMs / 1000)}s` : ''}
                        </span>
                    </div>
                ))}
            </div>
        </DataEventCard>
    );
}

function StepSummaryDataPart({ part }: { part: DataMessagePart<StepSummaryData> }) {
    return (
        <DataEventCard title={`Step Summary${part.data?.stepId ? `: ${part.data.stepId}` : ''}`} timestamp={part.data?.timestamp}>
            <p className="text-sm text-[#0f172a]">{part.data?.summary ?? ''}</p>
        </DataEventCard>
    );
}

function DecisionDataPart({ part }: { part: DataMessagePart<DecisionData> }) {
    return (
        <DataEventCard title="Decision" timestamp={part.data?.timestamp}>
            <p className="text-sm text-[#0f172a]">{part.data?.decision ?? 'Decision recorded'}</p>
            {part.data?.rationale ? (
                <p className="mt-2 text-[11px] text-[#475569]">{part.data.rationale}</p>
            ) : null}
        </DataEventCard>
    );
}

function ReportDataPart({ part }: { part: DataMessagePart<ReportData> }) {
    return (
        <DataEventCard title={`Report${part.data?.reportId ? ` #${part.data.reportId}` : ''}`} timestamp={part.data?.timestamp}>
            <JsonBlock value={part.data?.report ?? {}} />
        </DataEventCard>
    );
}

function DataPartFallback({ part }: { part: DataMessagePart }) {
    return (
        <DataEventCard title={`data-${part.name}`}>
            <JsonBlock value={part.data ?? {}} />
        </DataEventCard>
    );
}

function renderDataPart(part: DataMessagePart, index: number) {
    // 处理 mastra 命名空间的事件名称 (e.g., "mastra.stage" -> "stage")
    const name = part.name?.replace('mastra.', '') ?? '';

    switch (name) {
        case 'stage':
            return <StageDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<StageData>} />;
        case 'progress':
            return <ProgressDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<ProgressData>} />;
        case 'thinking':
            return <ThinkingDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<ThinkingData>} />;
        case 'tool-call':
            return <ToolCallDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<ToolCallData>} />;
        case 'tool-result':
            return <ToolResultDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<ToolResultData>} />;
        case 'artifact':
            return <ArtifactDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<ArtifactData>} />;
        case 'delta':
            return null;
        case 'divergence':
            return <DivergenceDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<DivergenceData>} />;
        case 'error':
            return <ErrorDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<ErrorData>} />;
        case 'complete':
            return <CompleteDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<CompleteData>} />;
        case 'round':
            return <RoundDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<RoundData>} />;
        case 'sources':
            return <SourcesDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<SourcesData>} />;
        case 'branch-status':
            return <BranchStatusDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<BranchStatusData>} />;
        case 'step-summary':
            return <StepSummaryDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<StepSummaryData>} />;
        case 'decision':
            return <DecisionDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<DecisionData>} />;
        case 'report':
            return <ReportDataPart key={`${part.name}-${index}`} part={part as DataMessagePart<ReportData>} />;
        default:
            return <DataPartFallback key={`${part.name}-${index}`} part={part} />;
    }
}

export function DataPartList({
    parts,
    className,
}: {
    parts: DataMessagePart[];
    className?: string;
}) {
    const rendered = parts.map((part, index) => renderDataPart(part, index)).filter(Boolean);
    if (rendered.length === 0) return null;
    return <div className={cn('flex flex-col gap-3', className)}>{rendered}</div>;
}
