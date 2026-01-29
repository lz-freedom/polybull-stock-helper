'use client';

import { useEffect, useState, useRef } from 'react';
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

import { extractStockInfoFromText } from '@/features/agents/actions/extract';

interface MainPageClientProps {
    locale: string;
}

const quickPrompts = [
    { icon: TrendingUp, textKey: 'prompt1' },
    { icon: BarChart3, textKey: 'prompt2' },
    { icon: LineChart, textKey: 'prompt3' },
    { icon: Newspaper, textKey: 'prompt4' },
];

const AGENT_OPTIONS = [
    { value: 'qa', label: 'QA 问答', icon: MessageSquare },
    { value: 'consensus', label: '共识分析', icon: BarChart3 },
    { value: 'research', label: '深度研究', icon: FileText },
];

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
    isStreaming?: boolean;
}

export function MainPageClient({ locale }: MainPageClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const t = useTranslations('home');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [agentType, setAgentType] = useState('qa');

    // Chat state
    const [hasStartedChat, setHasStartedChat] = useState(false);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const handleCreateSession = async (content: string) => {
        try {
            // Extract stock info from text first
            const info = await extractStockInfoFromText(content);
            const stockSymbol = info?.symbol || 'QUERY'; // Fallback if no symbol
            const exchange = info?.exchange || 'NASDAQ';

            // Determine action based on agent type
            let payload: any = {
                stockSymbol: stockSymbol,
                exchangeAcronym: exchange,
                title: info?.symbol ? `Analysis: ${info.symbol}` : `Query: ${content.slice(0, 20)}...`
            };

            const res = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_session',
                    ...payload
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.session) {
                    return data.session.id;
                }
            }
        } catch (error) {
            console.error('Failed to create session', error);
        }
        return null;
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const content = inputValue.trim();
        // Do not clear input value immediately if we fail, but for now we clear
        setInputValue('');
        setHasStartedChat(true);
        setIsLoading(true);

        try {
            // 1. Create Session explicitly
            // We use the same 'create_session' action as verified in NewChatPage
            const sessionId = crypto.randomUUID();

            // Extract info if needed (optional optimization, server can do it too)
            // But to keep consistent with NewChatPage simplest flow:
            const res = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_session',
                    session_id: sessionId,
                    stock_symbol: null,
                    exchange_acronym: null,
                    title: content.slice(0, 50) + (content.length > 50 ? '...' : '')
                })
            });

            if (!res.ok) {
                console.error('Failed to create session on server');
                // We proceed anyway to try to recover on the chat page?
                // Or we might fail here. Let's proceed as NewChatPage does.
            }

            // 2. Redirect to standardized route
            const params = new URLSearchParams();
            params.set('initial_prompt', content); // snake_case
            // params.set('type', agentType); // If backend supports type in create_session, we should pass it there. 
            // For now, let's keep it minimal as requested.

            router.push(`/${locale}/chat/${sessionId}?${params.toString()}`);

        } catch (error) {
            console.error('Failed to process request', error);
            // Fallback?
            const fallbackId = crypto.randomUUID();
            router.push(`/${locale}/chat/${fallbackId}?initial_prompt=${encodeURIComponent(content)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Fix IME bug: do not send if composing
        if (e.nativeEvent.isComposing) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const currentAgent = AGENT_OPTIONS.find(a => a.value === agentType) || AGENT_OPTIONS[0];

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
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 shadow-lg shadow-pink-500/25">
                                    <Sparkles className="h-7 w-7 text-white" />
                                </div>
                                <h1 className="text-2xl md:text-[32px] font-semibold text-foreground">
                                    {t('welcomeTitle')}
                                </h1>
                                <p className="text-muted-foreground dark:text-slate-400">
                                    {t('welcomeSubtitle')}
                                </p>
                            </div>
                        )}

                        {hasStartedChat && (
                            <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pb-4 pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex gap-4",
                                            msg.role === 'user' ? "flex-row-reverse" : ""
                                        )}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                                            msg.role === 'user'
                                                ? "bg-pink-500 text-white border-pink-500"
                                                : "bg-white dark:bg-zinc-800 text-foreground border-black/5 dark:border-white/10"
                                        )}>
                                            {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        </div>

                                        <div className={cn(
                                            "rounded-2xl px-5 py-3 text-sm shadow-sm max-w-[85%]",
                                            msg.role === 'user'
                                                ? "bg-pink-500 text-white rounded-tr-sm"
                                                : "bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-foreground rounded-tl-sm"
                                        )}>
                                            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                                {msg.content}
                                                {msg.isStreaming && (
                                                    <span className="inline-block w-2 h-4 ml-1 align-middle bg-pink-500 animate-pulse" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}

                        <div className={cn(
                            "relative transition-all duration-500 ease-in-out",
                            hasStartedChat ? "mt-auto pt-4" : ""
                        )}>
                            <div className="relative mx-auto max-w-3xl">
                                {!hasStartedChat && (
                                    <div className="mb-4 flex items-center justify-center">
                                        <div className="rounded-full border border-white/10 bg-black/40 px-4 py-1 text-xs font-semibold text-white">
                                            Surf Raised $15M
                                        </div>
                                    </div>
                                )}
                                <div className="relative flex flex-col gap-2 rounded-[14px] border border-black/10 bg-white px-4 py-3.5 backdrop-blur-[8px] dark:border-white/10 dark:bg-[#121417] shadow-sm transition-shadow hover:shadow-md">
                                    <div className="hidden dark:block absolute -top-px left-0 z-10 h-px w-52 opacity-80"
                                        style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                                    />
                                    <div className="hidden dark:block absolute -bottom-px right-0 z-10 h-px w-52 opacity-80"
                                        style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                                    />
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
                                                    <currentAgent.icon className="h-4 w-4" />
                                                    <span>{currentAgent.label}</span>
                                                    <ChevronDown className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                {AGENT_OPTIONS.map((option) => (
                                                    <DropdownMenuItem
                                                        key={option.value}
                                                        onClick={() => setAgentType(option.value)}
                                                        className="gap-2"
                                                    >
                                                        <option.icon className="h-4 w-4" />
                                                        {option.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={handleSend}
                                                disabled={!inputValue.trim() || isLoading}
                                                className={cn(
                                                    "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                                                    inputValue.trim()
                                                        ? "bg-pink-500 hover:bg-pink-600 text-white shadow-sm"
                                                        : "bg-muted text-muted-foreground cursor-not-allowed"
                                                )}
                                            >
                                                <Send className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!hasStartedChat && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <p className="text-xs text-muted-foreground text-center">{t('tryThese')}</p>
                                <div className="rounded-[14px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121417] p-4 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90 dark:text-slate-200">
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
                                                className="flex items-center gap-3 p-3 bg-white dark:bg-[#14171C] hover:bg-muted/50 dark:hover:bg-[#1A1E24] border border-black/10 dark:border-white/10 rounded-[12px] text-left transition-all duration-200 group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/10 to-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:from-pink-500/20 group-hover:to-orange-500/20 transition-colors">
                                                    <prompt.icon className="h-4 w-4 text-pink-500" />
                                                </div>
                                                <span className="text-sm text-foreground/80 group-hover:text-foreground line-clamp-2 dark:text-slate-200">
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
                                <div className="rounded-[14px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121417] p-4 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between text-sm font-semibold text-foreground/90 dark:text-slate-200">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4" />
                                            <span>事件日历</span>
                                        </div>
                                        <button type="button" className="text-xs text-muted-foreground hover:text-foreground">查看更多</button>
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex flex-col gap-2 w-full">
                                            <span className="text-xs font-semibold text-pink-500 bg-pink-500/10 w-fit px-2 py-0.5 rounded-full">即将上线</span>
                                            <div className="text-sm text-foreground/80 dark:text-slate-200">Aztec · Feb 11, 2026</div>
                                            <div className="text-sm text-foreground/80 dark:text-slate-200">Rainbow · Feb 05, 2026</div>
                                        </div>
                                        <div className="hidden md:block h-auto w-px bg黑/10 dark:bg-white/10" />
                                        <div className="flex flex-col gap-2 w-full">
                                            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">已上线</span>
                                            <div className="text-sm text-foreground/80 dark:text-slate-200">Seeker · Jan 21, 2026</div>
                                            <div className="text-sm text-foreground/80 dark:text-slate-200">Sentient · Jan 22, 2026</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[14px] border border-black/10 dark:border白/10 bg-white dark:bg-[#121417] p-4 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between text-sm font-semibold text-foreground/90 dark:text-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Search className="h-4 w-4" />
                                            <span>热门话题</span>
                                        </div>
                                        <button type="button" className="text-xs text-muted-foreground hover:text-foreground">查看更多</button>
                                    </div>
                                    <div className="space-y-2">
                                        {quickPrompts.map((prompt) => (
                                            <div key={prompt.textKey} className="flex items-center gap-3 text-sm text-foreground/80 dark:text-slate-200">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500">热门问题</span>
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
