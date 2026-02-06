'use client';

import type { ComponentType, ReactNode } from 'react';
import type { DataMessagePart } from '@assistant-ui/react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChainOfThought,
    ChainOfThoughtContent,
    ChainOfThoughtHeader,
    ChainOfThoughtRail,
    ChainOfThoughtSearchResult,
    ChainOfThoughtSearchResults,
    ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought';
import {
    CheckCircle2,
    FileText,
    ListChecks,
    Search,
} from 'lucide-react';
import type { CotStep } from '@/features/agents/lib/chat-contract';

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

type KeyValueItem = {
    label: string;
    value: string;
};

function resolveDataPartName(part: DataMessagePart): string {
    const rawName = typeof part.name === 'string' && part.name.length > 0
        ? part.name
        : typeof (part as { type?: string }).type === 'string'
            ? (part as { type: string }).type
            : '';

    if (!rawName) return '';
    const withoutPrefix = rawName.startsWith('data-') ? rawName.slice(5) : rawName;
    return withoutPrefix.replace('mastra.', '');
}

function formatTimestamp(timestamp?: number) {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toDisplayValue(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.trim() || null;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `数组(${value.length})`;
    if (typeof value === 'object') return '已解析';
    return null;
}

function buildKeyValueItems(data: Record<string, unknown>, allowlist: Array<[string, string]>) {
    const items: KeyValueItem[] = [];
    allowlist.forEach(([key, label]) => {
        const value = toDisplayValue(data[key]);
        if (value) items.push({ label, value });
    });
    return items;
}

function KeyValueList({ items }: { items: KeyValueItem[] }) {
    if (items.length === 0) return null;
    return (
        <div className="space-y-2 text-xs text-muted-foreground">
            {items.map((item) => (
                <div key={item.label} className="flex flex-wrap gap-2">
                    <span className="font-semibold text-muted-foreground">{item.label}</span>
                    <span className="text-foreground">{item.value}</span>
                </div>
            ))}
        </div>
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
        <Card className="border-border bg-card text-card-foreground shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        {title}
                    </CardTitle>
                    {timeLabel ? (
                        <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent className="pt-0">{children}</CardContent>
        </Card>
    );
}

function StageDataPart({ part }: { part: DataMessagePart<StageData> }) {
    const progress = typeof part.data?.progress === 'number' ? part.data.progress : undefined;
    const percent = progress !== undefined ? Math.round(progress * 100) : undefined;
    return (
        <DataEventCard title={`阶段：${part.data?.stage ?? '未知'}`} timestamp={part.data?.timestamp}>
            {part.data?.message ? (
                <p className="text-sm text-foreground">{part.data.message}</p>
            ) : null}
            {percent !== undefined && (
                <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                        />
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{percent}%</div>
                </div>
            )}
        </DataEventCard>
    );
}

function ProgressDataPart({ part }: { part: DataMessagePart<ProgressData> }) {
    return (
        <DataEventCard title={`进度：${part.data?.stepId ?? '步骤'}`} timestamp={part.data?.timestamp}>
            <div className="flex items-center justify-between">
                <span className="text-foreground">
                    {part.data?.message ?? '进度更新中'}
                </span>
                {typeof part.data?.percent === 'number' ? (
                    <span className="text-[11px] text-muted-foreground">
                        {part.data.percent}%
                    </span>
                ) : null}
            </div>
        </DataEventCard>
    );
}

function ThinkingDataPart({ part }: { part: DataMessagePart<ThinkingData> }) {
    return (
        <DataEventCard title="思维过程" timestamp={part.data?.timestamp}>
            <p className="text-sm text-foreground">
                {part.data?.message ?? '处理中...'}
            </p>
        </DataEventCard>
    );
}

function ToolCallDataPart({ part }: { part: DataMessagePart<ToolCallData> }) {
    return (
        <DataEventCard title={`工具调用：${part.data?.toolName ?? '工具'}`} timestamp={part.data?.timestamp}>
            <KeyValueList
                items={buildKeyValueItems(
                    {
                        callId: part.data?.callId ?? 'n/a',
                        args: part.data?.args,
                    },
                    [
                        ['callId', '调用ID'],
                        ['args', '参数'],
                    ],
                )}
            />
        </DataEventCard>
    );
}

function ToolResultDataPart({ part }: { part: DataMessagePart<ToolResultData> }) {
    return (
        <DataEventCard title="工具结果" timestamp={part.data?.timestamp}>
            <KeyValueList
                items={buildKeyValueItems(
                    {
                        callId: part.data?.callId ?? 'n/a',
                        result: part.data?.result,
                    },
                    [
                        ['callId', '调用ID'],
                        ['result', '结果'],
                    ],
                )}
            />
        </DataEventCard>
    );
}

function ArtifactDataPart({ part }: { part: DataMessagePart<ArtifactData> }) {
    return (
        <DataEventCard title={`产物：${part.data?.artifactType ?? '未知'}`} timestamp={part.data?.timestamp}>
            <KeyValueList
                items={buildKeyValueItems(
                    {
                        stepId: part.data?.stepId ?? 'n/a',
                    },
                    [['stepId', '步骤']],
                )}
            />
        </DataEventCard>
    );
}

function DivergenceDataPart({ part }: { part: DataMessagePart<DivergenceData> }) {
    const views = part.data?.views ?? [];
    return (
        <DataEventCard title={`分歧点：${part.data?.topic ?? '主题'}`} timestamp={part.data?.timestamp}>
            <div className="space-y-2">
                {views.length === 0 && <p>暂无分歧细节。</p>}
                {views.map((view, index) => (
                    <div
                        key={`${view.analyst ?? 'analyst'}-${index}`}
                        className="rounded-md border border-border bg-muted/40 p-2"
                    >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{view.analyst ?? `分析师 ${index + 1}`}</span>
                            <span>{view.stance ?? '未知'}</span>
                        </div>
                        <p className="mt-1 text-sm text-foreground">
                            {view.reasoning ?? ''}
                        </p>
                    </div>
                ))}
            </div>
        </DataEventCard>
    );
}

function ErrorDataPart({ part }: { part: DataMessagePart<ErrorData> }) {
    return (
        <DataEventCard title="错误" timestamp={part.data?.timestamp}>
            <p className="text-sm text-foreground">
                {part.data?.message ?? '发生错误'}
            </p>
            <div className="mt-2 text-[11px] text-muted-foreground">
                {part.data?.code ? `错误码：${part.data.code}` : null}
                {part.data?.recoverable !== undefined
                    ? ` • 可恢复：${part.data.recoverable ? '是' : '否'}`
                    : null}
            </div>
        </DataEventCard>
    );
}

function CompleteDataPart({ part }: { part: DataMessagePart<CompleteData> }) {
    return (
        <DataEventCard title="已完成" timestamp={part.data?.timestamp}>
            {typeof part.data?.duration === 'number' ? (
                <div className="mb-2 text-[11px] text-muted-foreground">
                    耗时：{Math.round(part.data.duration / 1000)} 秒
                </div>
            ) : null}
            <KeyValueList
                items={buildKeyValueItems(
                    {
                        result: typeof part.data?.result === 'string' ? part.data?.result : undefined,
                    },
                    [['result', '结果']],
                )}
            />
        </DataEventCard>
    );
}

function RoundDataPart({ part }: { part: DataMessagePart<RoundData> }) {
    const round = part.data?.round ?? 0;
    const totalRounds = part.data?.totalRounds;
    return (
        <DataEventCard title={`回合 ${round}${totalRounds ? ` / ${totalRounds}` : ''}`} timestamp={part.data?.timestamp}>
            {part.data?.agenda ? (
                <p className="text-sm text-foreground">{part.data.agenda}</p>
            ) : null}
            {part.data?.speaker ? (
                <div className="mt-2 text-[11px] text-muted-foreground">
                    发言者：{part.data.speaker}
                </div>
            ) : null}
        </DataEventCard>
    );
}

function SourcesDataPart({ part }: { part: DataMessagePart<SourcesData | SourcesData['sources']> }) {
    const sources = Array.isArray(part.data) ? part.data : part.data?.sources ?? [];
    return (
        <DataEventCard title="来源" timestamp={!Array.isArray(part.data) ? part.data?.timestamp : undefined}>
            <div className="space-y-2">
                {sources.length === 0 && <p>暂无来源。</p>}
                {sources.map((source, index) => (
                    <div
                        key={`${source.url ?? source.title ?? 'source'}-${index}`}
                        className="rounded-md border border-border bg-muted/40 p-2"
                    >
                        <div className="text-sm text-foreground">
                            {source.title ?? source.url ?? '未命名来源'}
                        </div>
                        {source.url ? (
                            <div className="text-[11px] text-muted-foreground">{source.url}</div>
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
        <DataEventCard title="分支状态" timestamp={part.data?.timestamp}>
            <div className="space-y-2">
                {branches.length === 0 && <p>暂无分支更新。</p>}
                {branches.map((branch, index) => (
                    <div
                        key={`${branch.id ?? 'branch'}-${index}`}
                        className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-2 py-1"
                    >
                        <span className="text-sm text-foreground">
                            {branch.id ?? `分支 ${index + 1}`}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            {branch.status ?? '未知'}
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
        <DataEventCard title={`步骤小结${part.data?.stepId ? `：${part.data.stepId}` : ''}`} timestamp={part.data?.timestamp}>
            <p className="text-sm text-foreground">{part.data?.summary ?? ''}</p>
        </DataEventCard>
    );
}

function DecisionDataPart({ part }: { part: DataMessagePart<DecisionData> }) {
    return (
        <DataEventCard title="结论" timestamp={part.data?.timestamp}>
            <p className="text-sm text-foreground">
                {part.data?.decision ?? '已记录结论'}
            </p>
            {part.data?.rationale ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                    {part.data.rationale}
                </p>
            ) : null}
        </DataEventCard>
    );
}

function ReportDataPart({ part }: { part: DataMessagePart<ReportData> }) {
    return (
        <DataEventCard title={`报告${part.data?.reportId ? ` #${part.data.reportId}` : ''}`} timestamp={part.data?.timestamp}>
            <KeyValueList
                items={[
                    ...buildKeyValueItems(
                        {
                            reportId: part.data?.reportId,
                        },
                        [['reportId', '报告ID']],
                    ),
                    ...buildKeyValueItems(
                        part.data?.report && typeof part.data.report === 'object'
                            ? (part.data.report as Record<string, unknown>)
                            : {},
                        [
                            ['title', '标题'],
                            ['summary', '摘要'],
                            ['overallSummary', '总览'],
                        ],
                    ),
                ]}
            />
        </DataEventCard>
    );
}

function DataPartFallback({ part }: { part: DataMessagePart }) {
    const name = resolveDataPartName(part) || 'unknown';
    const items = buildKeyValueItems(
        (part.data && typeof part.data === 'object' ? (part.data as Record<string, unknown>) : {}),
        [
            ['message', '说明'],
            ['status', '状态'],
            ['stepId', '步骤'],
            ['progress', '进度'],
            ['percent', '进度'],
            ['decision', '结论'],
        ],
    );
    return (
        <DataEventCard title={`数据：${name}`}>
            {items.length > 0 ? (
                <KeyValueList items={items} />
            ) : (
                <p className="text-xs text-muted-foreground">已隐藏结构化数据。</p>
            )}
        </DataEventCard>
    );
}

const CHAIN_EVENT_NAMES = new Set([
    'thinking',
    'stage',
    'progress',
    'round',
    'decision',
    'step-summary',
    'sources',
]);

type ChainStep = {
    id: string;
    key: string;
    title: string;
    description?: string;
    status: CotStep['status'];
    icon?: ComponentType<{ className?: string }>;
    evidence?: string[];
    percent?: number;
};

function formatHostname(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

function buildChainSteps(parts: DataMessagePart[]): ChainStep[] {
    const steps: ChainStep[] = [];

    parts.forEach((part, index) => {
        const name = resolveDataPartName(part);
        const isLast = index === parts.length - 1;

        if (!CHAIN_EVENT_NAMES.has(name)) return;

        if (name === 'stage') {
            const data = part.data as StageData;
            steps.push({
                id: `stage-${index}`,
                key: `${part.name}-${index}`,
                title: `阶段：${data?.stage ?? '处理中'}`,
                description: data?.message,
                status: isLast ? 'active' : 'complete',
                icon: ListChecks,
                percent:
                    typeof data?.progress === 'number'
                        ? Math.round(data.progress * 100)
                        : undefined,
            });
            return;
        }

        if (name === 'progress') {
            const data = part.data as ProgressData;
            const percent =
                typeof data?.percent === 'number' ? `${Math.round(data.percent)}%` : undefined;
            steps.push({
                id: `progress-${index}`,
                key: `${part.name}-${index}`,
                title: data?.message ?? `进度：${data?.stepId ?? '步骤'}`,
                description: percent,
                status: typeof data?.percent === 'number' && data.percent < 100 ? 'active' : 'complete',
                icon: ListChecks,
                percent: typeof data?.percent === 'number' ? data.percent : undefined,
            });
            return;
        }

        if (name === 'round') {
            const data = part.data as RoundData;
            const roundLabel = `回合 ${data?.round ?? 0}${data?.totalRounds ? ` / ${data.totalRounds}` : ''}`;
            const detail = [data?.agenda, data?.speaker ? `发言者：${data.speaker}` : null]
                .filter(Boolean)
                .join(' · ');
            steps.push({
                id: `round-${index}`,
                key: `${part.name}-${index}`,
                title: roundLabel,
                description: detail || undefined,
                status: isLast ? 'active' : 'complete',
                icon: FileText,
            });
            return;
        }

        if (name === 'decision') {
            const data = part.data as DecisionData;
            steps.push({
                id: `decision-${index}`,
                key: `${part.name}-${index}`,
                title: data?.decision ? `决策：${data.decision}` : '已记录决策',
                description: data?.rationale,
                status: 'complete',
                icon: CheckCircle2,
            });
            return;
        }

        if (name === 'step-summary') {
            const data = part.data as StepSummaryData;
            steps.push({
                id: `summary-${index}`,
                key: `${part.name}-${index}`,
                title: data?.summary ?? '步骤小结',
                description: data?.stepId ? `来源：${data.stepId}` : undefined,
                status: 'complete',
                icon: FileText,
            });
            return;
        }

        if (name === 'sources') {
            const data = part.data as SourcesData | SourcesData['sources'];
            const sources = Array.isArray(data)
                ? data
                : data?.sources ?? [];
            steps.push({
                id: `sources-${index}`,
                key: `${part.name}-${index}`,
                title: '引用来源',
                status: isLast ? 'active' : 'complete',
                icon: Search,
                evidence: sources
                    .map((source) => source?.url ?? source?.title)
                    .filter((value): value is string => typeof value === 'string' && value.length > 0)
                    .map(formatHostname),
            });
            return;
        }
    });

    return steps;
}

function renderDataPart(part: DataMessagePart, index: number) {
    const name = resolveDataPartName(part);

    switch (name) {
        case 'stage':
            return <StageDataPart key={`${name}-${index}`} part={part as DataMessagePart<StageData>} />;
        case 'progress':
            return <ProgressDataPart key={`${name}-${index}`} part={part as DataMessagePart<ProgressData>} />;
        case 'thinking':
            return <ThinkingDataPart key={`${name}-${index}`} part={part as DataMessagePart<ThinkingData>} />;
        case 'tool-call':
            return <ToolCallDataPart key={`${name}-${index}`} part={part as DataMessagePart<ToolCallData>} />;
        case 'tool-result':
            return <ToolResultDataPart key={`${name}-${index}`} part={part as DataMessagePart<ToolResultData>} />;
        case 'artifact':
            return <ArtifactDataPart key={`${name}-${index}`} part={part as DataMessagePart<ArtifactData>} />;
        case 'delta':
            return null;
        case 'divergence':
            return <DivergenceDataPart key={`${name}-${index}`} part={part as DataMessagePart<DivergenceData>} />;
        case 'error':
            return <ErrorDataPart key={`${name}-${index}`} part={part as DataMessagePart<ErrorData>} />;
        case 'complete':
            return <CompleteDataPart key={`${name}-${index}`} part={part as DataMessagePart<CompleteData>} />;
        case 'round':
            return <RoundDataPart key={`${name}-${index}`} part={part as DataMessagePart<RoundData>} />;
        case 'sources':
            return <SourcesDataPart key={`${name}-${index}`} part={part as DataMessagePart<SourcesData>} />;
        case 'branch-status':
            return <BranchStatusDataPart key={`${name}-${index}`} part={part as DataMessagePart<BranchStatusData>} />;
        case 'step-summary':
            return <StepSummaryDataPart key={`${name}-${index}`} part={part as DataMessagePart<StepSummaryData>} />;
        case 'decision':
            return <DecisionDataPart key={`${name}-${index}`} part={part as DataMessagePart<DecisionData>} />;
        case 'report':
            return <ReportDataPart key={`${name}-${index}`} part={part as DataMessagePart<ReportData>} />;
        default:
            return <DataPartFallback key={`${name || 'data'}-${index}`} part={part} />;
    }
}

export function DataPartList({
    parts,
    className,
}: {
    parts: DataMessagePart[];
    className?: string;
}) {
    const chainParts = parts.filter((part) => {
        const name = resolveDataPartName(part);
        return CHAIN_EVENT_NAMES.has(name);
    });
    const otherParts = parts.filter((part) => {
        const name = resolveDataPartName(part);
        return !CHAIN_EVENT_NAMES.has(name);
    });

    const chainSteps = buildChainSteps(chainParts);
    const lastStep = chainSteps[chainSteps.length - 1];
    const chain =
        chainSteps.length > 0 ? (
            <ChainOfThought defaultOpen className="bg-muted/30">
                <ChainOfThoughtHeader>
                    <span>思维链</span>
                    {lastStep?.title ? (
                        <span className="truncate text-xs font-normal text-muted-foreground">
                            当前：{lastStep.title}
                        </span>
                    ) : null}
                    {lastStep?.status ? (
                        <Badge variant={lastStep.status === 'active' ? 'default' : 'secondary'} className="ml-auto text-[10px]">
                            {lastStep.status === 'active' ? '进行中' : lastStep.status === 'pending' ? '等待中' : '已完成'}
                        </Badge>
                    ) : null}
                </ChainOfThoughtHeader>
                <ChainOfThoughtContent className="space-y-3">
                    <ChainOfThoughtRail>
                        {chainSteps.map((step) => (
                            <ChainOfThoughtStep
                                key={step.key}
                                label={step.title}
                                description={step.description}
                                status={step.status}
                                icon={step.icon}
                            >
                                {step.evidence && step.evidence.length > 0 ? (
                                    <ChainOfThoughtSearchResults>
                                        {step.evidence.map((evidence) => (
                                            <ChainOfThoughtSearchResult key={`${step.id}-${evidence}`}>
                                                {evidence}
                                            </ChainOfThoughtSearchResult>
                                        ))}
                                    </ChainOfThoughtSearchResults>
                                ) : null}
                                {typeof step.percent === 'number' ? (
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-[width]"
                                            style={{ width: `${Math.min(Math.max(step.percent, 0), 100)}%` }}
                                        />
                                    </div>
                                ) : null}
                            </ChainOfThoughtStep>
                        ))}
                    </ChainOfThoughtRail>
                </ChainOfThoughtContent>
            </ChainOfThought>
        ) : null;

    const rendered = otherParts.map((part, index) => renderDataPart(part, index)).filter(Boolean);
    if (!chain && rendered.length === 0) return null;

    return (
        <div className={cn('flex flex-col gap-4', className)}>
            {chain}
            {rendered}
        </div>
    );
}
