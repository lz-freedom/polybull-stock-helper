'use client';

import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    BarChart3,
    Bot,
    ChevronDown,
    FileText,
    Loader2,
    MessageSquare,
    Square,
    Search,
    Send,
    Sparkles,
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
    type ToolCallMessagePartProps,
} from '@assistant-ui/react';
import { AssistantChatTransport, useAISDKRuntime } from '@assistant-ui/react-ai-sdk';

import { cn } from '@/lib/utils';
import { StockPriceCard } from '@/components/chat-cards/stock-price-card';
import { NewsCard } from '@/components/chat-cards/news-card';
import { FinancialsCard } from '@/components/chat-cards/financials-card';
import { DataPartList } from '@/components/assistant-ui/data-parts';
import { ToolFallback } from '@/components/assistant-ui/tool-fallback';
import { ReportViewer } from '@/features/agents/components/report-viewer';
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

function ToolPlaceholder({
    label,
    status,
}: {
    label: string;
    status?: ToolCallMessagePartProps['status'];
}) {
    const stateLabel = status?.type === 'running'
        ? '执行中'
        : status?.type === 'incomplete'
          ? '未完成'
          : status?.type === 'requires-action'
            ? '需要确认'
            : '准备中';

    return (
        <div className="rounded-2xl border border-[#d0d7eb] bg-white px-3 py-3 text-xs text-[#475569]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#94a3b8]">
                <Loader2 className="h-3 w-3 animate-spin text-sky-500" />
                <span>{label}</span>
                <span className="ml-auto text-[10px] text-[#0f172a]">{stateLabel}</span>
            </div>
        </div>
    );
}

function StockPriceToolPart({
    result,
    args,
    status,
}: ToolCallMessagePartProps<DisplayStockPricePayload, DisplayStockPricePayload>) {
    const payload = result ?? args;
    if (!payload || typeof payload.price !== 'number') {
        return <ToolPlaceholder label="displayStockPrice" status={status} />;
    }

    return <StockPriceCard {...payload} />;
}

function NewsToolPart({
    result,
    args,
    status,
}: ToolCallMessagePartProps<DisplayNewsPayload, DisplayNewsPayload>) {
    const payload = result ?? args;
    if (!payload || !Array.isArray(payload.news)) {
        return <ToolPlaceholder label="displayNews" status={status} />;
    }

    return <NewsCard symbol={payload.symbol} news={payload.news} />;
}

function FinancialsToolPart({
    result,
    args,
    status,
}: ToolCallMessagePartProps<DisplayFinancialsPayload, DisplayFinancialsPayload>) {
    const payload = result ?? args;
    if (!payload || !Array.isArray(payload.metrics)) {
        return <ToolPlaceholder label="displayFinancials" status={status} />;
    }

    return <FinancialsCard symbol={payload.symbol} metrics={payload.metrics} />;
}

function MessageDataParts() {
    const messageContent = useAuiState(({ message }) => message.content);
    const dataParts = useMemo(
        () => messageContent.filter((part) => part.type === 'data') as DataMessagePart[],
        [messageContent],
    );

    if (dataParts.length === 0) return null;

    return <DataPartList parts={dataParts} className="mt-3" />;
}

function UserTextPart({ text }: TextMessagePartProps) {
    return (
        <div className="rounded-2xl border border-[#e2e8f0] bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#0f172a] shadow-sm">
            <p className="whitespace-pre-wrap">{text}</p>
        </div>
    );
}

function AssistantTextPart({ text }: TextMessagePartProps) {
    return (
        <div className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm text-[#0f172a] shadow-md">
            <p className="whitespace-pre-wrap">{text}</p>
        </div>
    );
}

function UserMessage() {
    return (
        <MessagePrimitive.Root className="relative flex w-full max-w-[var(--thread-max-width)] flex-row-reverse gap-3 self-center py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white">
                <UserIcon className="h-4 w-4" />
            </div>
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
                  (part) =>
                      part.type === 'text' &&
                      typeof (part as { text?: unknown }).text === 'string' &&
                      (part as { text?: string }).text?.trim().length > 0,
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
        <MessagePrimitive.Root className="relative flex w-full max-w-[var(--thread-max-width)] gap-3 self-center py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                <Bot className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-3">
                <h1 className="inline-flex items-center gap-2 text-lg font-semibold text-pink-500">
                    <Sparkles className="h-4 w-4" />
                    Answer
                </h1>
                <MessagePrimitive.Parts
                    components={{
                        Text: AssistantTextPart,
                        tools: {
                            by_name: {
                                displayStockPrice: StockPriceToolPart,
                                displayNews: NewsToolPart,
                                displayFinancials: FinancialsToolPart,
                            },
                            Fallback: ToolFallback,
                        },
                    }}
                />
                <MessageDataParts />
            </div>
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
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-semibold text-[#0f172a] shadow-sm"
                >
                    <currentMode.icon className="h-3.5 w-3.5 text-[#0f172a]" />
                    <span>{currentMode.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#64748b]" />
                </button>
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
                                <span className="ml-auto text-[10px] text-red-500">
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
};

function ChatComposer({ placeholder, className, inputClassName, sendClassName }: ChatComposerProps) {
    return (
        <ComposerPrimitive.Root
            className={cn(
                'flex items-center gap-3 rounded-xl border border-pink-200 bg-white px-2 py-1.5 transition focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500/30',
                className,
            )}
        >
            <ComposerPrimitive.Input
                placeholder={placeholder}
                className={cn(
                    'min-h-[48px] flex-1 resize-none bg-transparent px-4 py-3 text-base text-[#0f172a] placeholder:text-[#8b8b8b] outline-none',
                    inputClassName,
                )}
            />
            <div className="flex items-center gap-2">
                <AuiIf condition={({ thread }) => !thread.isRunning}>
                    <ComposerPrimitive.Send
                        className={cn(
                            'inline-flex h-12 w-12 items-center justify-center rounded-full bg-pink-600 text-white transition hover:bg-pink-700',
                            sendClassName,
                        )}
                    >
                        <Send className="h-5 w-5" />
                    </ComposerPrimitive.Send>
                </AuiIf>
                <AuiIf condition={({ thread }) => thread.isRunning}>
                    <ComposerPrimitive.Cancel className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#0f172a] transition hover:bg-[#f1f5f9]">
                        <Square className="h-4 w-4 fill-current" />
                    </ComposerPrimitive.Cancel>
                </AuiIf>
            </div>
        </ComposerPrimitive.Root>
    );
}

export default function ChatPage({ params }: ChatPageProps) {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
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
    const [quotaByMode, setQuotaByMode] = useState<Record<ChatMode, QuotaInfo> | null>(null);
    const [quotaError, setQuotaError] = useState<string | null>(null);

    useEffect(() => {
        if (initialMode) {
            setMode(resolveMode(initialMode));
        }
    }, [initialMode]);

    const transportRef = useRef<AssistantChatTransport<UIMessage> | null>(null);
    if (!transportRef.current) {
        transportRef.current = new AssistantChatTransport<UIMessage>({
            api: '/api/agents/chat',
            body: {
                session_id: sessionId,
                mode,
            },
            prepareSendMessagesRequest: async (options) => {
                const reportContext = reportContextRef.current;
                const baseBody = options.body ?? {};

                return {
                    body: {
                        ...baseBody,
                        ...(reportContext ? { reportContext } : {}),
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

    useEffect(() => {
        transport.body = {
            session_id: sessionId,
            mode,
        };
    }, [sessionId, mode, transport]);

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
    const reportPart = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const message = messages[i];
            if (!Array.isArray(message.parts)) continue;
            for (let j = message.parts.length - 1; j >= 0; j -= 1) {
                const part = message.parts[j];
                if (part?.type === 'data' && part.name === 'report') {
                    return part as DataMessagePart;
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

    const threadMaxWidth = isReportMode ? '72rem' : '42rem';
    const reportTitle =
        reportData && typeof (reportData.report as { title?: unknown })?.title === 'string'
            ? ((reportData.report as { title?: string })?.title ?? undefined)
            : undefined;
    const reportSummary = reportData
        ? reportData.reportType === 'research'
            ? ((reportData.report as { executiveSummary?: string })?.executiveSummary ?? undefined)
            : ((reportData.report as { overallSummary?: string })?.overallSummary ?? undefined)
        : undefined;
    const reportAgentType = reportData?.reportType ?? 'consensus';
    const reportRunId = typeof reportData?.runId === 'number' ? reportData.runId : null;
    const followUpSummary = reportSummary ?? reportTitle;
    const quotaBanner = quotaError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {quotaError}
        </div>
    ) : null;

    useEffect(() => {
        reportContextRef.current = isReportMode && followUpSummary ? followUpSummary : null;
    }, [isReportMode, followUpSummary]);

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            <ThreadPrimitive.Root
                className="h-full bg-transparent text-[#0f172a]"
                style={{ ['--thread-max-width' as string]: threadMaxWidth }}
            >
                <ThreadPrimitive.Empty>
                    <div className="flex h-full w-full items-center justify-center px-4">
                        <div className="flex w-full max-w-[var(--thread-max-width)] grow flex-col gap-12">
                            <div className="flex w-full grow flex-col items-center justify-center">
                                <p className="text-4xl text-[#0f172a] md:text-5xl">What do you want to know?</p>
                            </div>
                            <div className="flex w-full items-center justify-center">
                                <ModeSelector
                                    mode={mode}
                                    onChange={setMode}
                                    disabledModes={disabledModes}
                                />
                            </div>
                            <ChatComposer
                                placeholder="Ask anything..."
                                className="w-full"
                                inputClassName="bg-transparent text-[#0f172a] placeholder:text-[#8b8b8b]"
                                sendClassName="bg-pink-600 text-white hover:bg-pink-700"
                            />
                        </div>
                    </div>
                </ThreadPrimitive.Empty>

                <AuiIf condition={({ thread }) => !thread.isEmpty}>
                    <ThreadPrimitive.Viewport className="flex h-full w-full flex-col items-center overflow-y-auto scroll-smooth px-4 pt-8">
                        {isReportMode ? (
                            <div className="flex w-full max-w-[var(--thread-max-width)] flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                {quotaBanner ? <div className="lg:col-span-2">{quotaBanner}</div> : null}
                                <div className="flex items-center justify-between lg:col-span-2">
                                    <div className="flex items-center gap-3">
                                        <ModeSelector
                                            mode={mode}
                                            onChange={setMode}
                                            options={followUpOptions}
                                            disabledModes={disabledModes}
                                        />
                                        <span className="text-xs text-[#64748b]">
                                            报告追问仅支持即时/严谨
                                        </span>
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                                    {reportRunId ? (
                                        <ReportViewer
                                            agentRunId={reportRunId}
                                            agentType={reportAgentType}
                                            initialReport={reportData?.report ?? null}
                                            reportTitle={reportTitle}
                                            reportSummary={reportSummary}
                                            isStreaming={false}
                                        />
                                    ) : (
                                        <div className="text-sm text-[#64748b]">报告加载中...</div>
                                    )}
                                </div>
                                <div className="flex min-h-[60vh] flex-col">
                                    <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
                                    <div className="min-h-8 grow" />
                                    <div className="sticky bottom-0 mt-3 flex w-full flex-col items-center justify-end bg-inherit pb-4">
                                        <ChatComposer
                                            placeholder="Ask anything..."
                                            className="w-full"
                                            inputClassName="bg-transparent text-[#0f172a] placeholder:text-[#8b8b8b]"
                                            sendClassName="bg-pink-600 text-white hover:bg-pink-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {quotaBanner ? (
                                    <div className="mb-3 w-full max-w-[var(--thread-max-width)]">
                                        {quotaBanner}
                                    </div>
                                ) : null}
                                <div className="mb-4 flex w-full max-w-[var(--thread-max-width)] items-center justify-between">
                                    <ModeSelector
                                        mode={mode}
                                        onChange={setMode}
                                        options={MODE_OPTIONS}
                                        disabledModes={disabledModes}
                                    />
                                </div>
                                <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
                                <div className="min-h-8 grow" />
                                <div className="sticky bottom-0 mt-3 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end bg-inherit pb-4">
                                    <ChatComposer
                                        placeholder="Ask anything..."
                                        className="w-full"
                                        inputClassName="bg-transparent text-[#0f172a] placeholder:text-[#8b8b8b]"
                                        sendClassName="bg-pink-600 text-white hover:bg-pink-700"
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
