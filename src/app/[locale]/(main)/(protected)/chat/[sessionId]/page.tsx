'use client';

import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    BarChart3,
    ChevronDown,
    FileText,
    Loader2,
    MessageSquare,
    Search,
    User as UserIcon,
} from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { type UIMessage } from 'ai';
import {
    AssistantRuntimeProvider,
    AuiIf,
    ComposerPrimitive,
    MessagePrimitive,
    ThreadPrimitive,
    useAuiState,
    type DataMessagePart,
    type TextMessagePartProps,
} from '@assistant-ui/react';
import { AssistantChatTransport, useAISDKRuntime } from '@assistant-ui/react-ai-sdk';

import { cn } from '@/lib/utils';
import { StockPriceCard } from '@/components/chat-cards/stock-price-card';
import { NewsCard } from '@/components/chat-cards/news-card';
import { FinancialsCard } from '@/components/chat-cards/financials-card';
import { DataPartList } from '@/components/assistant-ui/data-parts';
import { MarkdownText } from '@/components/assistant-ui/markdown-text';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
    PromptInputBody,
    PromptInputFooter,
    PromptInputStop,
    PromptInputSubmit,
    PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ReportViewer } from '@/features/agents/components/report-viewer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    CHAT_MODE_OPTIONS,
    CHAT_MODES,
    FOLLOW_UP_ALLOWED_MODES,
    type ChatMode,
} from '@/features/agents/lib/chat-contract';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatPageProps {
    params: Promise<{ locale: string; sessionId: string }>;
}

type DisplayStockPricePayload = {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    currency?: string;
    marketCap?: string;
    high?: number;
    low?: number;
};

type DisplayNewsPayload = {
    symbol: string;
    news: {
        title: string;
        source: string;
        url: string;
        publishedAt: string;
    }[];
};

type DisplayFinancialsPayload = {
    symbol: string;
    metrics: {
        label: string;
        value: string | number;
        period?: string;
    }[];
};

type QuotaInfo = {
    mode: ChatMode;
    limit: number;
    used: number;
    remaining: number;
    overLimit: boolean;
    periodKey: string;
};

type AnyMessagePart = {
    type?: string;
    [key: string]: unknown;
};

const MODE_ICONS = {
    [CHAT_MODES.INSTANT]: MessageSquare,
    [CHAT_MODES.RIGOROUS]: Search,
    [CHAT_MODES.CONSENSUS]: BarChart3,
    [CHAT_MODES.RESEARCH]: FileText,
} as const;

const MODE_OPTIONS = CHAT_MODE_OPTIONS.map((option) => ({
    ...option,
    icon: MODE_ICONS[option.id] ?? MessageSquare,
}));

const JSON_SUMMARY_KEYS: Array<[string, string]> = [
    ['title', '标题'],
    ['summary', '摘要'],
    ['overallSummary', '总览'],
    ['decision', '结论'],
    ['rationale', '依据'],
    ['stage', '阶段'],
    ['stepId', '步骤'],
    ['reportType', '报告类型'],
];

const EMPTY_PARTS: readonly AnyMessagePart[] = Object.freeze([]) as readonly AnyMessagePart[];

function tryParseJsonSummary(text: string): Array<{ label: string; value: string }> | null {
    const trimmed = text.trim();
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;
    try {
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const items: Array<{ label: string; value: string }> = [];
        const labelMap = new Map(JSON_SUMMARY_KEYS);
        JSON_SUMMARY_KEYS.forEach(([key, label]) => {
            const value = (parsed as Record<string, unknown>)[key];
            if (value === null || value === undefined) return;
            if (typeof value === 'string' && value.trim()) {
                items.push({ label, value: value.trim() });
                return;
            }
            if (typeof value === 'number' || typeof value === 'boolean') {
                items.push({ label, value: String(value) });
            }
        });
        if (items.length > 0) return items;
        const fallbackEntries = Object.entries(parsed as Record<string, unknown>)
            .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
            .slice(0, 8);
        if (fallbackEntries.length === 0) return null;
        fallbackEntries.forEach(([key, value]) => {
            items.push({
                label: labelMap.get(key) ?? key,
                value: typeof value === 'string' ? value.trim() : String(value),
            });
        });
        return items.length > 0 ? items : null;
    } catch {
        return null;
    }
}

function resolveMode(value: string | null): ChatMode {
    if (!value) return CHAT_MODES.INSTANT;
    return Object.values(CHAT_MODES).includes(value as ChatMode)
        ? (value as ChatMode)
        : CHAT_MODES.INSTANT;
}

function parseStoredMessage(content: string) {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed?.parts)) return parsed.parts;
        if (Array.isArray(parsed)) return parsed;
    } catch {
        return null;
    }

    return null;
}

const TEN_PART_KEYS = [
    'business',
    'revenue',
    'industry',
    'competition',
    'financial',
    'risk',
    'management',
    'scenario',
    'valuation',
    'long_thesis',
] as const;

function buildReportContext(
    reportData?: {
        report?: unknown;
        reportType?: 'consensus' | 'research';
    },
): string | null {
    if (!reportData?.report) return null;
    const report = reportData.report as Record<string, any>;
    const lines: string[] = [];
    const bulletItems: string[] = [];
    const maxItems = 10;

    if (reportData.reportType === 'research') {
        const summary = typeof report.summary === 'string' ? report.summary : undefined;
        if (summary) lines.push(`报告摘要：${summary}`);

        const modules =
            report.modules && typeof report.modules === 'object' ? report.modules : report;
        for (const key of TEN_PART_KEYS) {
            const section = modules?.[key];
            if (!section || !Array.isArray(section.keyPoints)) continue;
            for (const point of section.keyPoints) {
                if (typeof point !== 'string' || !point.trim()) continue;
                bulletItems.push(point.trim());
                if (bulletItems.length >= maxItems) break;
            }
            if (bulletItems.length >= maxItems) break;
        }
        if (bulletItems.length > 0) {
            lines.push(`关键要点：${bulletItems.map((item) => `- ${item}`).join('\n')}`);
        }
    } else {
        const summary =
            typeof report.overallSummary === 'string'
                ? report.overallSummary
                : typeof report.summary === 'string'
                    ? report.summary
                    : undefined;
        if (summary) lines.push(`共识摘要：${summary}`);

        if (Array.isArray(report.consensusPoints)) {
            for (const point of report.consensusPoints) {
                if (typeof point?.point === 'string' && point.point.trim()) {
                    bulletItems.push(point.point.trim());
                }
                if (bulletItems.length >= maxItems) break;
            }
        }

        if (bulletItems.length < maxItems && Array.isArray(report.disagreementPoints)) {
            for (const point of report.disagreementPoints) {
                if (typeof point?.topic === 'string' && point.topic.trim()) {
                    bulletItems.push(`分歧：${point.topic.trim()}`);
                }
                if (bulletItems.length >= maxItems) break;
            }
        }

        if (bulletItems.length > 0) {
            lines.push(`关键要点：${bulletItems.map((item) => `- ${item}`).join('\n')}`);
        }
    }

    const text = lines.join('\n');
    if (!text.trim()) return null;
    return text.length > 1600 ? `${text.slice(0, 1600)}...` : text;
}

type ToolStatusType = 'running' | 'complete' | 'error' | 'incomplete' | 'requires-action' | 'ready';

function ToolPlaceholder({
    label,
    statusType,
}: {
    label: string;
    statusType?: ToolStatusType;
}) {
    const labelMap: Record<string, string> = {
        displayStockPrice: '股价卡片',
        displayNews: '新闻卡片',
        displayFinancials: '财务卡片',
    };
    const displayLabel = labelMap[label] ?? label;
    const stateLabel = statusType === 'running'
        ? '执行中'
        : statusType === 'incomplete'
            ? '未完成'
            : statusType === 'requires-action'
                ? '需要确认'
                : statusType === 'complete'
                    ? '已完成'
                    : statusType === 'error'
                        ? '失败'
                        : '准备中';

    return (
        <Card className="border-border bg-muted/40">
            <CardContent className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                {statusType === 'running' ? (
                    <Loader2 className="h-3 w-3 animate-spin text-info" />
                ) : null}
                <span className="font-medium text-foreground">{displayLabel}</span>
                <Badge variant="secondary" className="ml-auto text-[11px]">
                    {stateLabel}
                </Badge>
            </CardContent>
        </Card>
    );
}

function StockPriceToolPart({
    result,
    args,
    statusType,
}: {
    result?: DisplayStockPricePayload;
    args?: DisplayStockPricePayload;
    statusType?: ToolStatusType;
}) {
    const payload = result ?? args;
    if (!payload || typeof payload.price !== 'number') {
        return (
            <Message from="assistant">
                <MessageContent
                    data-from="assistant"
                    className="border-0 bg-transparent p-0 shadow-none"
                >
                    <ToolPlaceholder label="displayStockPrice" statusType={statusType} />
                </MessageContent>
            </Message>
        );
    }

    return (
        <Message from="assistant">
            <MessageContent
                data-from="assistant"
                className="border-0 bg-transparent p-0 shadow-none"
            >
                <StockPriceCard {...payload} />
            </MessageContent>
        </Message>
    );
}

function NewsToolPart({
    result,
    args,
    statusType,
}: {
    result?: DisplayNewsPayload;
    args?: DisplayNewsPayload;
    statusType?: ToolStatusType;
}) {
    const payload = result ?? args;
    if (!payload || !Array.isArray(payload.news)) {
        return (
            <Message from="assistant">
                <MessageContent
                    data-from="assistant"
                    className="border-0 bg-transparent p-0 shadow-none"
                >
                    <ToolPlaceholder label="displayNews" statusType={statusType} />
                </MessageContent>
            </Message>
        );
    }

    return (
        <Message from="assistant">
            <MessageContent
                data-from="assistant"
                className="border-0 bg-transparent p-0 shadow-none"
            >
                <NewsCard symbol={payload.symbol} news={payload.news} />
            </MessageContent>
        </Message>
    );
}

function FinancialsToolPart({
    result,
    args,
    statusType,
}: {
    result?: DisplayFinancialsPayload;
    args?: DisplayFinancialsPayload;
    statusType?: ToolStatusType;
}) {
    const payload = result ?? args;
    if (!payload || !Array.isArray(payload.metrics)) {
        return (
            <Message from="assistant">
                <MessageContent
                    data-from="assistant"
                    className="border-0 bg-transparent p-0 shadow-none"
                >
                    <ToolPlaceholder label="displayFinancials" statusType={statusType} />
                </MessageContent>
            </Message>
        );
    }

    return (
        <Message from="assistant">
            <MessageContent
                data-from="assistant"
                className="border-0 bg-transparent p-0 shadow-none"
            >
                <FinancialsCard symbol={payload.symbol} metrics={payload.metrics} />
            </MessageContent>
        </Message>
    );
}

function MessageDataParts() {
    // useAuiState selector 必须返回可缓存引用，禁止在 selector 中创建新数组/对象。
    const messageContent = useAuiState(({ message }) =>
        Array.isArray(message.content) ? (message.content as AnyMessagePart[]) : EMPTY_PARTS,
    );
    const dataParts = useMemo(
        () =>
            messageContent.filter(
                (part) => typeof part?.type === 'string' && part.type.startsWith('data-'),
            ) as DataMessagePart[],
        [messageContent],
    );

    if (dataParts.length === 0) return null;

    return (
        <div className="mt-4 w-full max-w-[var(--thread-max-width)]">
            <DataPartList parts={dataParts} />
        </div>
    );
}

function UserTextPart({ text }: TextMessagePartProps) {
    return (
        <Card className="w-full max-w-[var(--thread-max-width)] border-border bg-card text-card-foreground shadow-sm">
            <CardContent className="flex items-start gap-3 p-3">
                <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-warning/10 text-primary-foreground">
                        <UserIcon className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>
                <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
            </CardContent>
        </Card>
    );
}

function AssistantTextPart({ text }: TextMessagePartProps) {
    if (!text || !text.trim()) return null;
    const summaryItems = tryParseJsonSummary(text);
    if (summaryItems) {
        return (
            <div className="space-y-2 text-sm text-muted-foreground">
                {summaryItems.map((item) => (
                    <div key={item.label} className="flex flex-wrap gap-2">
                        <span className="font-semibold text-muted-foreground">
                            {item.label}
                        </span>
                        <span className="text-foreground">
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="text-sm text-foreground">
            <MarkdownText />
        </div>
    );
}

type ToolMessagePart = {
    type: string;
    toolCallId?: string;
    state?: string;
    args?: unknown;
    result?: unknown;
};

function mapToolStatus(state?: string): ToolStatusType {
    if (!state) return 'ready';
    if (state.includes('input') || state.includes('streaming')) return 'running';
    if (state === 'output-available') return 'complete';
    if (state === 'output-error') return 'error';
    return 'ready';
}

function safeStringify(value: unknown): string | null {
    try {
        return JSON.stringify(value ?? {});
    } catch {
        return null;
    }
}

function AssistantToolParts() {
    // useAuiState selector 必须返回可缓存引用，禁止在 selector 中创建新数组/对象。
    const messageParts = useAuiState(({ message }) =>
        Array.isArray(message.parts) ? (message.parts as AnyMessagePart[]) : EMPTY_PARTS,
    );

    const toolParts = useMemo(
        () =>
            messageParts.filter(
                (part): part is ToolMessagePart =>
                    typeof part.type === 'string' && part.type.startsWith('tool-'),
            ),
        [messageParts],
    );

    const dedupedToolParts = useMemo(() => {
        const seen = new Set<string>();
        const list: ToolMessagePart[] = [];
        toolParts.forEach((part) => {
            const toolName = part.type.replace('tool-', '');
            const payload = part.result ?? part.args;
            const fingerprint = safeStringify(payload) ?? part.toolCallId ?? toolName;
            const key = `${toolName}:${fingerprint}`;
            if (seen.has(key)) return;
            seen.add(key);
            list.push(part);
        });
        return list;
    }, [toolParts]);

    if (dedupedToolParts.length === 0) return null;

    return (
        <div className="space-y-3">
            {dedupedToolParts.map((part, index) => {
                const toolName = part.type.replace('tool-', '');
                const statusType = mapToolStatus(part.state);
                const key = part.toolCallId ?? `${toolName}-${index}`;

                if (toolName === 'displayStockPrice') {
                    return (
                        <StockPriceToolPart
                            key={key}
                            result={part.result as DisplayStockPricePayload | undefined}
                            args={part.args as DisplayStockPricePayload | undefined}
                            statusType={statusType}
                        />
                    );
                }

                if (toolName === 'displayNews') {
                    return (
                        <NewsToolPart
                            key={key}
                            result={part.result as DisplayNewsPayload | undefined}
                            args={part.args as DisplayNewsPayload | undefined}
                            statusType={statusType}
                        />
                    );
                }

                if (toolName === 'displayFinancials') {
                    return (
                        <FinancialsToolPart
                            key={key}
                            result={part.result as DisplayFinancialsPayload | undefined}
                            args={part.args as DisplayFinancialsPayload | undefined}
                            statusType={statusType}
                        />
                    );
                }

                return (
                    <Message from="assistant" key={key}>
                        <MessageContent
                            data-from="assistant"
                            className="border-0 bg-transparent p-0 shadow-none"
                        >
                            <ToolPlaceholder label={toolName} statusType={statusType} />
                        </MessageContent>
                    </Message>
                );
            })}
        </div>
    );
}

function UserMessage() {
    return (
        <MessagePrimitive.Root className="relative flex w-full max-w-[var(--thread-max-width)] flex-row gap-3 self-start py-4">
            <div className="flex flex-col gap-2">
                <MessagePrimitive.Parts
                    components={{
                        Text: UserTextPart,
                    }}
                />
                <MessageDataParts />
            </div>
        </MessagePrimitive.Root>
    );
}

function AssistantMessage() {
    const hasText = useAuiState(({ message }) =>
        Array.isArray(message.parts)
            ? message.parts.some(
                (part) => {
                    const text = (part as { text?: unknown }).text;
                    return part.type === 'text' && typeof text === 'string' && text.trim().length > 0;
                },
            )
            : false,
    );
    const hasToolParts = useAuiState(({ message }) =>
        Array.isArray(message.parts)
            ? message.parts.some(
                (part) =>
                    typeof part.type === 'string' && part.type.startsWith('tool-'),
            )
            : false,
    );
    const hasDataParts = useAuiState(({ message }) =>
        Array.isArray(message.content)
            ? message.content.some((part) => part?.type === 'data')
            : false,
    );
    const shouldRender = hasText || hasToolParts || hasDataParts;
    if (!shouldRender) return null;
    return (
        <MessagePrimitive.Root className="relative flex w-full max-w-[var(--thread-max-width)] flex-col gap-3 self-start py-3">
            <MessagePrimitive.Parts
                components={{
                    Text: AssistantTextPart,
                }}
            />
            <AssistantToolParts />
            <MessageDataParts />
        </MessagePrimitive.Root>
    );
}

function ModeSelector({
    mode,
    onChange,
    options,
    disabledModes,
}: {
    mode: ChatMode;
    onChange: (nextMode: ChatMode) => void;
    options?: typeof MODE_OPTIONS;
    disabledModes?: Set<ChatMode>;
}) {
    const availableOptions = options ?? MODE_OPTIONS;
    const currentMode =
        availableOptions.find((option) => option.id === mode) ?? availableOptions[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 rounded-full px-3 text-xs"
                >
                    <currentMode.icon className="h-3.5 w-3.5 text-foreground" />
                    <span>{currentMode.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {availableOptions.map((option) => {
                    const isDisabled = disabledModes?.has(option.id) ?? false;
                    return (
                        <DropdownMenuItem
                            key={option.id}
                            onClick={() => onChange(option.id)}
                            className="gap-2"
                            disabled={isDisabled}
                        >
                            <option.icon className="h-4 w-4" />
                            {option.label}
                            {isDisabled && (
                                <span className="ml-auto text-[10px] text-destructive">
                                    配额不足
                                </span>
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

type ChatComposerProps = {
    placeholder: string;
    className?: string;
    inputClassName?: string;
    sendClassName?: string;
    mode: ChatMode;
    onModeChange: (nextMode: ChatMode) => void;
    modeOptions?: typeof MODE_OPTIONS;
    disabledModes?: Set<ChatMode>;
};

function ChatComposer({
    placeholder,
    className,
    inputClassName,
    sendClassName,
    mode,
    onModeChange,
    modeOptions,
    disabledModes,
}: ChatComposerProps) {
    return (
        <ComposerPrimitive.Root
            className={cn(
                'flex flex-col gap-3 rounded-3xl border border-border bg-card px-3 py-2.5 shadow-sm transition focus-within:border-muted-foreground',
                className,
            )}
        >
            <PromptInputBody>
                <ComposerPrimitive.Input
                    placeholder={placeholder}
                    className={cn(
                        'min-h-[72px] flex-1 resize-none bg-transparent px-2 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none',
                        inputClassName,
                    )}
                />
            </PromptInputBody>
            <PromptInputFooter>
                <PromptInputTools>
                    <ModeSelector
                        mode={mode}
                        onChange={onModeChange}
                        options={modeOptions}
                        disabledModes={disabledModes}
                    />
                </PromptInputTools>
                <AuiIf condition={({ thread }) => !thread.isRunning}>
                    <ComposerPrimitive.Send asChild>
                        <PromptInputSubmit className={sendClassName} />
                    </ComposerPrimitive.Send>
                </AuiIf>
                <AuiIf condition={({ thread }) => thread.isRunning}>
                    <ComposerPrimitive.Cancel asChild>
                        <PromptInputStop />
                    </ComposerPrimitive.Cancel>
                </AuiIf>
            </PromptInputFooter>
        </ComposerPrimitive.Root>
    );
}

export default function ChatPage({ params }: ChatPageProps) {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">加载中...</div>}>
            <ChatPageContent params={params} />
        </Suspense>
    );
}

function ChatPageContent({ params }: ChatPageProps) {
    const { locale, sessionId } = use(params);
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/${locale}/sign-in`);
        }
    }, [status, router, locale]);

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const hasTriggeredAutoSend = useRef(false);
    const searchParams = useSearchParams();
    const initialPrompt = searchParams.get('initial_prompt');
    const initialMode = searchParams.get('mode');
    const [mode, setMode] = useState<ChatMode>(() => resolveMode(initialMode));
    const reportContextRef = useRef<string | null>(null);
    const requestStateRef = useRef<{ sessionId: string; mode: ChatMode }>({
        sessionId,
        mode,
    });
    const [quotaByMode, setQuotaByMode] = useState<Record<ChatMode, QuotaInfo> | null>(null);
    const [quotaError, setQuotaError] = useState<string | null>(null);

    useEffect(() => {
        if (initialMode) {
            setMode(resolveMode(initialMode));
        }
    }, [initialMode]);

    useEffect(() => {
        requestStateRef.current = { sessionId, mode };
    }, [mode, sessionId]);

    const transportRef = useRef<AssistantChatTransport<UIMessage> | null>(null);
    if (!transportRef.current) {
        transportRef.current = new AssistantChatTransport<UIMessage>({
            api: '/api/agents/chat',
            prepareSendMessagesRequest: async (options) => {
                const reportContext = reportContextRef.current;
                const baseBody = options.body ?? {};
                const state = requestStateRef.current;

                return {
                    body: {
                        session_id: state.sessionId,
                        mode: state.mode,
                        ...baseBody,
                        ...(reportContext ? { reportContext } : {}),
                        options: {
                            ...(baseBody as { options?: Record<string, unknown> })?.options,
                            fromReport: Boolean(reportContext),
                        },
                        id: options.id,
                        messages: options.messages,
                        trigger: options.trigger,
                        messageId: options.messageId,
                        metadata: options.requestMetadata,
                    },
                };
            },
        });
    }
    const transport = transportRef.current;

    const chat = useChat({
        id: sessionId,
        transport,
        onError: (error) => {
            const message = error instanceof Error ? error.message : String(error);
            if (message.toLowerCase().includes('quota')) {
                setQuotaError('额度已用完，请切换模式或稍后再试。');
            } else {
                setQuotaError(message);
            }
        },
    });

    const { messages, sendMessage, setMessages } = chat;
    type ReportMessagePart = {
        type: string;
        data?: unknown;
    };
    const reportPart = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const message = messages[i];
            if (!Array.isArray(message.parts)) continue;
            for (let j = message.parts.length - 1; j >= 0; j -= 1) {
                const part = message.parts[j];
                if (part?.type === 'data-report') {
                    return part as ReportMessagePart;
                }
            }
        }
        return null;
    }, [messages]);
    const reportData = reportPart?.data as
        | {
            report?: unknown;
            reportId?: number;
            reportType?: 'consensus' | 'research';
            runId?: number;
        }
        | undefined;
    const isReportMode = Boolean(reportData?.report);
    const followUpOptions = useMemo(
        () => MODE_OPTIONS.filter((option) => FOLLOW_UP_ALLOWED_MODES.includes(option.id)),
        [],
    );
    const disabledModes = useMemo(() => {
        if (!quotaByMode) return new Set<ChatMode>();
        return new Set(
            Object.values(quotaByMode)
                .filter((quota) => quota.overLimit)
                .map((quota) => quota.mode),
        );
    }, [quotaByMode]);

    useEffect(() => {
        if (isReportMode && !FOLLOW_UP_ALLOWED_MODES.includes(mode)) {
            setMode(CHAT_MODES.INSTANT);
        }
    }, [isReportMode, mode]);

    useEffect(() => {
        if (!disabledModes.has(mode)) return;
        const available = (isReportMode ? followUpOptions : MODE_OPTIONS).find(
            (option) => !disabledModes.has(option.id),
        )?.id;
        if (available && available !== mode) {
            setMode(available);
        }
        setQuotaError('当前模式配额已用完，请切换模式。');
    }, [disabledModes, followUpOptions, isReportMode, mode]);

    useEffect(() => {
        if (quotaError && !disabledModes.has(mode)) {
            setQuotaError(null);
        }
    }, [disabledModes, mode, quotaError]);
    const runtime = useAISDKRuntime(chat, {
        adapters: {
            threadList: {
                threadId: sessionId,
            },
        },
    });

    useEffect(() => {
        transport.setRuntime(runtime);
    }, [runtime, transport]);

    useEffect(() => {
        let isMounted = true;
        async function loadQuota() {
            try {
                const res = await fetch('/api/agents/chat?action=get_quota');
                if (!res.ok) return;
                const data = await res.json();
                if (isMounted && data?.success && Array.isArray(data.quotas)) {
                    const mapped = data.quotas.reduce(
                        (acc: Record<ChatMode, QuotaInfo>, quota: QuotaInfo) => {
                            acc[quota.mode] = quota;
                            return acc;
                        },
                        {} as Record<ChatMode, QuotaInfo>,
                    );
                    setQuotaByMode(mapped);
                }
            } catch (error) {
                console.warn('Failed to load quota', error);
            }
        }
        loadQuota();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                const res = await fetch(`/api/agents/chat?action=get_messages&session_id=${sessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        const mappedMessages = (data.messages || []).map((m: any) => {
                            const stored = typeof m.content === 'string'
                                ? parseStoredMessage(m.content)
                                : null;
                            const parts = stored?.length
                                ? stored
                                : [
                                    {
                                        type: 'text',
                                        text: typeof m.content === 'string' ? m.content : '',
                                    },
                                ];

                            return {
                                id: m.id?.toString?.() ?? String(m.id ?? crypto.randomUUID()),
                                role: m.role,
                                parts,
                                metadata: {
                                    createdAt: m.createdAt,
                                },
                            } satisfies UIMessage;
                        }) as UIMessage[];
                        setMessages(mappedMessages);
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (isMounted) setIsInitialLoading(false);
            }
        }
        if (sessionId) load();
        return () => {
            isMounted = false;
        };
    }, [sessionId, setMessages]);

    useEffect(() => {
        if (!isInitialLoading && initialPrompt && !hasTriggeredAutoSend.current && messages.length === 0) {
            hasTriggeredAutoSend.current = true;
            sendMessage({
                text: initialPrompt,
            });
        }
    }, [isInitialLoading, initialPrompt, sendMessage, messages.length]);

    const threadMaxWidth = isReportMode ? '100%' : '42rem';
    const reportTitle =
        reportData && typeof (reportData.report as { title?: unknown })?.title === 'string'
            ? ((reportData.report as { title?: string })?.title ?? undefined)
            : undefined;
    const reportSummary = reportData
        ? reportData.reportType === 'research'
            ? ((reportData.report as { summary?: string })?.summary ?? undefined)
            : ((reportData.report as { overallSummary?: string })?.overallSummary ?? undefined)
        : undefined;
    const reportAgentType = reportData?.reportType ?? 'consensus';
    const reportRunId = typeof reportData?.runId === 'number' ? reportData.runId : null;
    const reportContext = useMemo(() => buildReportContext(reportData), [reportData]);
    const quotaBanner = quotaError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {quotaError}
        </div>
    ) : null;

    useEffect(() => {
        reportContextRef.current = isReportMode ? reportContext : null;
    }, [isReportMode, reportContext]);

    if (isInitialLoading) {
        return (
            <AssistantRuntimeProvider runtime={runtime}>
                <ThreadPrimitive.Root
                    className="h-full bg-background text-foreground"
                    style={{ ['--thread-max-width' as string]: '42rem' }}
                >
                    <div className="flex h-full w-full items-center justify-center px-4">
                        <Card className="w-full max-w-md border-border bg-card shadow-sm">
                            <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span>正在加载会话记录...</span>
                            </CardContent>
                        </Card>
                    </div>
                </ThreadPrimitive.Root>
            </AssistantRuntimeProvider>
        );
    }

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            <ThreadPrimitive.Root
                className="h-full bg-background text-foreground"
                style={{ ['--thread-max-width' as string]: threadMaxWidth }}
            >
                <ThreadPrimitive.Empty>
                    <div className="flex h-full w-full items-center justify-center px-4">
                        <div className="flex w-full max-w-[var(--thread-max-width)] grow flex-col gap-12">
                            <div className="flex w-full grow flex-col items-center justify-center">
                                <p className="text-4xl text-foreground md:text-5xl">想了解什么？</p>
                            </div>
                            <ChatComposer
                                placeholder="尽管问，带图也行"
                                className="w-full"
                                inputClassName="bg-transparent"
                                sendClassName="bg-primary text-primary-foreground hover:bg-primary"
                                mode={mode}
                                onModeChange={setMode}
                                modeOptions={MODE_OPTIONS}
                                disabledModes={disabledModes}
                            />
                        </div>
                    </div>
                </ThreadPrimitive.Empty>

                <AuiIf condition={({ thread }) => !thread.isEmpty}>
                    <ThreadPrimitive.Viewport className="flex h-full w-full flex-col items-start overflow-y-auto scroll-smooth px-4 pt-8">
                        {isReportMode ? (
                            <div className="flex w-full max-w-[var(--thread-max-width)] flex-col gap-4">
                                {quotaBanner ? <div>{quotaBanner}</div> : null}
                                <ResizablePanelGroup direction="horizontal" className="min-h-[70vh] w-full">
                                    <ResizablePanel defaultSize={66} minSize={45}>
                                        <div className="h-full rounded-3xl border border-border bg-card p-4 shadow-sm">
                                            {reportRunId ? (
                                                <ReportViewer
                                                    agentRunId={reportRunId}
                                                    agentType={reportAgentType}
                                                    initialReport={(reportData?.report as any) ?? null}
                                                    reportTitle={reportTitle}
                                                    reportSummary={reportSummary}
                                                    isStreaming={false}
                                                />
                                            ) : (
                                                <div className="text-sm text-muted-foreground">报告加载中...</div>
                                            )}
                                        </div>
                                    </ResizablePanel>
                                    <ResizableHandle className="mx-3" />
                                    <ResizablePanel defaultSize={34} minSize={25}>
                                        <div className="flex h-full min-h-[60vh] flex-col">
                                            <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
                                            <div className="min-h-8 grow" />
                                            <div className="sticky bottom-0 mt-3 flex w-full flex-col items-start justify-end bg-inherit pb-4">
                                                <div className="mb-2 text-xs text-muted-foreground">
                                                    报告追问仅支持即时/严谨
                                                </div>
                                                <ChatComposer
                                                    placeholder="继续追问..."
                                                    className="w-full"
                                                    inputClassName="bg-transparent"
                                                    sendClassName="bg-primary text-primary-foreground hover:bg-primary"
                                                    mode={mode}
                                                    onModeChange={setMode}
                                                    modeOptions={followUpOptions}
                                                    disabledModes={disabledModes}
                                                />
                                            </div>
                                        </div>
                                    </ResizablePanel>
                                </ResizablePanelGroup>
                            </div>
                        ) : (
                            <>
                                {quotaBanner ? (
                                    <div className="mb-3 w-full max-w-[var(--thread-max-width)]">
                                        {quotaBanner}
                                    </div>
                                ) : null}
                                <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
                                <div className="min-h-8 grow" />
                                <div className="sticky bottom-0 mt-3 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end bg-inherit pb-4">
                                    <ChatComposer
                                        placeholder="继续对话..."
                                        className="w-full"
                                        inputClassName="bg-transparent"
                                        sendClassName="bg-primary text-primary-foreground hover:bg-primary"
                                        mode={mode}
                                        onModeChange={setMode}
                                        modeOptions={MODE_OPTIONS}
                                        disabledModes={disabledModes}
                                    />
                                </div>
                            </>
                        )}
                    </ThreadPrimitive.Viewport>
                </AuiIf>
            </ThreadPrimitive.Root>
        </AssistantRuntimeProvider>
    );
}
