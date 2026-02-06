'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Send, TrendingUp, BarChart3, LineChart, Newspaper, ChevronDown, CalendarDays, Search, Clock, MessageSquare, FileText, User, Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AuthModal } from '@features/shared/components/common/auth-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
    CHAT_MODE_OPTIONS,
    CHAT_MODES,
    type ChatMode,
} from '@/features/agents/lib/chat-contract';

interface MainPageClientProps {
    locale: string;
}

const quickPrompts = [
    { icon: TrendingUp, textKey: 'prompt1' },
    { icon: BarChart3, textKey: 'prompt2' },
    { icon: LineChart, textKey: 'prompt3' },
    { icon: Newspaper, textKey: 'prompt4' },
];

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

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
    isStreaming?: boolean;
}

type QuotaInfo = {
    mode: ChatMode;
    limit: number;
    used: number;
    remaining: number;
    overLimit: boolean;
    periodKey: string;
};

export function MainPageClient({ locale }: MainPageClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const t = useTranslations('home');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [mode, setMode] = useState<ChatMode>(CHAT_MODES.INSTANT);
    const [quotaByMode, setQuotaByMode] = useState<Record<ChatMode, QuotaInfo> | null>(null);
    const [quotaNotice, setQuotaNotice] = useState<string | null>(null);

    // Chat state
    const [hasStartedChat] = useState(false);
    const [messages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const disabledModes = useMemo(() => {
        if (!quotaByMode) return new Set<ChatMode>();
        return new Set(
            Object.values(quotaByMode)
                .filter((quota) => quota.overLimit)
                .map((quota) => quota.mode),
        );
    }, [quotaByMode]);

    // 检测 auth=required 参数，自动弹出登录窗口
    useEffect(() => {
        if (searchParams.get('auth') === 'required') {
            setShowAuthModal(true);
            const callbackUrl = searchParams.get('callbackUrl');
            if (callbackUrl) {
                sessionStorage.setItem('authCallbackUrl', callbackUrl);
            }
            router.replace(`/${locale}`);
        }
    }, [searchParams, router, locale]);

    useEffect(() => {
        if (hasStartedChat && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    });

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
        if (disabledModes.size > 0 && disabledModes.has(mode)) {
            const nextMode = MODE_OPTIONS.find((option) => !disabledModes.has(option.id))
                ?.id ?? CHAT_MODES.INSTANT;
            setMode(nextMode);
            setQuotaNotice('当前模式配额已用完，请切换模式。');
        } else {
            setQuotaNotice(null);
        }
    }, [disabledModes, mode]);

    const handleSend = () => {
        if (!inputValue.trim() || isLoading) return;
        if (disabledModes.has(mode)) {
            setQuotaNotice('当前模式配额已用完，请切换模式后再试。');
            return;
        }

        const content = inputValue.trim();
        setInputValue('');
        setIsLoading(true);

        const params = new URLSearchParams();
        params.set('initial_prompt', content);
        params.set('mode', mode);
        router.push(`/${locale}/chat/new?${params.toString()}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Fix IME bug: do not send if composing
        if (e.nativeEvent.isComposing) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const currentMode = MODE_OPTIONS.find((option) => option.id === mode) ?? MODE_OPTIONS[0];

    return (
        <>
            <div className="min-h-[calc(100vh-6rem)] flex flex-col">
                <div
                    className="flex-1 flex items-center justify-center p-6 md:p-8"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, rgba(var(--marketing-dots-bg-rgb), 0) 0%, rgba(var(--marketing-dots-bg-rgb), 0) 55%, rgba(var(--marketing-dots-bg-rgb), 1) 85%), radial-gradient(circle, rgba(var(--marketing-dots-rgb), 0.22) 1px, transparent 1px)',
                        backgroundRepeat: 'no-repeat, repeat',
                        backgroundPosition: 'center, center',
                        backgroundSize: 'auto, 14px 14px',
                    }}
                >
                    <div className="max-w-3xl w-full space-y-8 flex flex-col h-full justify-center">
                        {!hasStartedChat && (
                            <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-accent-foreground to-secondary shadow-lg shadow-primary/25">
                                    <Sparkles className="h-7 w-7 text-primary-foreground" />
                                </div>
                                <h1 className="text-2xl md:text-[32px] font-semibold text-foreground">
                                    {t('welcomeTitle')}
                                </h1>
                                <p className="text-muted-foreground">
                                    {t('welcomeSubtitle')}
                                </p>
                            </div>
                        )}

                        {hasStartedChat && (
                            <div className="flex-1 min-h-0 space-y-6 overflow-y-auto pb-4 pr-2 scrollbar-thin">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            'flex gap-4',
                                            msg.role === 'user' ? 'flex-row-reverse' : '',
                                        )}
                                    >
                                        <div className={cn(
                                            'h-8 w-8 rounded-full flex items-center justify-center shrink-0 border',
                                            msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-card text-foreground border-border',
                                        )}>
                                            {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        </div>

                                        <div className={cn(
                                            'rounded-2xl px-5 py-3 text-sm shadow-sm max-w-[85%]',
                                            msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                : 'bg-card border border-border text-foreground rounded-tl-sm',
                                        )}>
                                            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                                {msg.content}
                                                {msg.isStreaming && (
                                                    <span className="inline-block w-2 h-4 ml-1 align-middle bg-primary animate-pulse" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}

                        <div className={cn(
                            'relative transition-all duration-500 ease-in-out',
                            hasStartedChat ? 'mt-auto pt-4' : '',
                        )}>
                            <div className="relative mx-auto max-w-3xl">
                                {!hasStartedChat && (
                                    <div className="mb-4 flex items-center justify-center">
                                        <div className="rounded-full border border-border bg-foreground/60 px-4 py-1 text-xs font-semibold text-primary-foreground">
                                            Surf Raised $15M
                                        </div>
                                    </div>
                                )}
                                <div className="relative flex flex-col gap-2 rounded-[14px] border border-border bg-card px-4 py-3.5 shadow-sm backdrop-blur-[8px] transition-shadow hover:shadow-md">
                                    <div className="sheen-divider absolute -top-px left-0 z-10 hidden h-px w-52 opacity-80 dark:block" />
                                    <div className="sheen-divider absolute -bottom-px right-0 z-10 hidden h-px w-52 opacity-80 dark:block" />
                                    <textarea
                                        placeholder={t('inputPlaceholder')}
                                        rows={1}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none resize-none min-h-[50px] max-h-[150px]"
                                    />
                                    <div className="flex items-center justify-between">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="-ml-1 inline-flex items-center gap-1 rounded-[6px] px-1 py-0.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                                >
                                                    <currentMode.icon className="h-4 w-4" />
                                                    <span>{currentMode.label}</span>
                                                    <ChevronDown className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                {MODE_OPTIONS.map((option) => {
                                                    const isDisabled = disabledModes.has(option.id);
                                                    return (
                                                        <DropdownMenuItem
                                                            key={option.id}
                                                            onClick={() => setMode(option.id)}
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

                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={handleSend}
                                                disabled={!inputValue.trim() || isLoading}
                                                className={cn(
                                                    'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
                                                    inputValue.trim()
                                                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                                                        : 'bg-muted text-muted-foreground cursor-not-allowed',
                                                )}
                                            >
                                                <Send className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    {quotaNotice && (
                                        <p className="text-xs text-destructive">{quotaNotice}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {!hasStartedChat && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <p className="text-xs text-muted-foreground text-center">{t('tryThese')}</p>
                                <div className="rounded-[14px] border border-border bg-card dark:bg-card p-4 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                                        <BarChart3 className="h-4 w-4" />
                                        <span>Top Asked on iVibe (24h)</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {quickPrompts.map((prompt) => (
                                            <button
                                                key={prompt.textKey}
                                                type="button"
                                                onClick={() => {
                                                    setInputValue(t(prompt.textKey));
                                                }}
                                                className="flex items-center gap-3 p-3 bg-card hover:bg-muted/50 border border-border rounded-[12px] text-left transition-all duration-200 group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors">
                                                    <prompt.icon className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="text-sm text-foreground/80 group-hover:text-foreground line-clamp-2">
                                                    {t(prompt.textKey)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!hasStartedChat && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                                <div className="rounded-[14px] border border-border bg-card dark:bg-card p-4 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between text-sm font-semibold text-foreground/90">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4" />
                                            <span>事件日历</span>
                                        </div>
                                        <button type="button" className="text-xs text-muted-foreground hover:text-foreground">查看更多</button>
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex flex-col gap-2 w-full">
                                            <span className="text-xs font-semibold text-primary bg-primary/10 w-fit px-2 py-0.5 rounded-full">即将上线</span>
                                            <div className="text-sm text-foreground/80">Aztec · Feb 11, 2026</div>
                                            <div className="text-sm text-foreground/80">Rainbow · Feb 05, 2026</div>
                                        </div>
                                        <div className="hidden md:block h-auto w-px bg-border" />
                                        <div className="flex flex-col gap-2 w-full">
                                            <span className="text-xs font-semibold text-success bg-success/10 w-fit px-2 py-0.5 rounded-full">已上线</span>
                                            <div className="text-sm text-foreground/80">Seeker · Jan 21, 2026</div>
                                            <div className="text-sm text-foreground/80">Sentient · Jan 22, 2026</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[14px] border border-border bg-card p-4 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between text-sm font-semibold text-foreground/90">
                                        <div className="flex items-center gap-2">
                                            <Search className="h-4 w-4" />
                                            <span>热门话题</span>
                                        </div>
                                        <button type="button" className="text-xs text-muted-foreground hover:text-foreground">查看更多</button>
                                    </div>
                                    <div className="space-y-2">
                                        {quickPrompts.map((prompt) => (
                                            <div key={prompt.textKey} className="flex items-center gap-3 text-sm text-foreground/80">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">热门问题</span>
                                                <span className="truncate flex-1">{t(prompt.textKey)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!hasStartedChat && (
                            <p className="text-xs text-muted-foreground text-center animate-in fade-in duration-1000">
                                {t('disclaimer')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                locale={locale}
            />
        </>
    );
}
