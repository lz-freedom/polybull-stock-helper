'use client';

import { Suspense, use, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Send,
    Bot,
    User as UserIcon,
    Loader2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { Message } from 'ai';
import { StockPriceCard } from '@/components/chat-cards/stock-price-card';
import { NewsCard } from '@/components/chat-cards/news-card';
import { FinancialsCard } from '@/components/chat-cards/financials-card';

interface ChatPageProps {
    params: Promise<{ locale: string; sessionId: string }>;
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
    const t = useTranslations('home');

    // Auth check
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/${locale}/sign-in`);
        }
    }, [status, router, locale]);

    const [initialMessages, setInitialMessages] = useState<Message[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const { messages, input = '', handleInputChange, handleSubmit, append, setMessages, isLoading } = useChat({
        api: '/api/agents/chat',
        body: {
            action: 'send_message',
            session_id: sessionId,
        },
        initialMessages,
        id: sessionId,
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasTriggeredAutoSend = useRef(false);
    const searchParams = useSearchParams();
    const initialPrompt = searchParams.get('initial_prompt');

    // Auto-scroll
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Initial Load
    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                const res = await fetch(`/api/agents/chat?action=get_messages&session_id=${sessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        const mappedMessages = (data.messages || []).map((m: any) => ({
                            id: m.id.toString(),
                            role: m.role,
                            content: m.content || '',
                            createdAt: new Date(m.createdAt)
                        }));
                        setInitialMessages(mappedMessages);
                        setMessages(mappedMessages);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (isMounted) setIsInitialLoading(false);
            }
        }
        if (sessionId) load();
        return () => { isMounted = false; };
    }, [sessionId, setMessages]);

    // Handle initial prompt
    useEffect(() => {
        if (!isInitialLoading && initialPrompt && !hasTriggeredAutoSend.current && messages.length === 0) {
            hasTriggeredAutoSend.current = true;
            append({
                role: 'user',
                content: initialPrompt,
            });
        }
    }, [isInitialLoading, initialPrompt, append, messages.length]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isLoading) {
                const form = e.currentTarget.closest('form');
                if (form) form.requestSubmit();
            }
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
            {/* Header */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center shadow-md">
                    <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-foreground">Surf Chat</h1>
                    <p className="text-sm text-muted-foreground">AI-powered market intelligence</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                {/* Chat Area - Open Flow */}
                <div className="flex-1 w-full max-w-3xl mx-auto pb-36">
                    <div className="space-y-12">
                        {isInitialLoading && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-20">
                                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                            </div>
                        )}

                        {!isInitialLoading && messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-20 text-muted-foreground">
                                No messages yet. Start a conversation!
                            </div>
                        )}


                        {messages.map((msg, index) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-4 group",
                                    msg.role === 'user' ? "flex-row-reverse" : ""
                                )}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border mt-1",
                                    msg.role === 'user'
                                        ? "bg-pink-500 text-white border-pink-500"
                                        : "bg-transparent text-foreground border-transparent"
                                )}>
                                    {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-6 w-6 text-pink-500" />}
                                </div>

                                <div className={cn(
                                    "flex-1 min-w-0 space-y-2",
                                    msg.role === 'user' ? "flex justify-end" : ""
                                )}>
                                    <div className={cn(
                                        "max-w-[90%]",
                                        msg.role === 'user'
                                            ? "bg-muted/30 dark:bg-zinc-800/50 rounded-2xl px-6 py-4 text-left"
                                            : ""
                                    )}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-foreground">
                                                {msg.role === 'user' ? 'You' : 'Surf AI'}
                                            </span>
                                            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                {msg.createdAt ? msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed break-words",
                                            msg.role === 'user' ? "prose-p:m-0" : ""
                                        )}>
                                            {msg.content}
                                            {isLoading && index === messages.length - 1 && msg.role === 'assistant' && !msg.toolInvocations && (
                                                <span className="inline-block w-2 h-4 ml-1 align-middle bg-pink-500 animate-pulse" />
                                            )}
                                        </div>

                                        {/* Tool Invocations (Part 2: Cards) */}
                                        {msg.toolInvocations?.map((toolInvocation) => {
                                            const { toolName, toolCallId, state } = toolInvocation;

                                            if (state === 'result') {
                                                // Since we are just displaying, we might only need 'call' state if we want to show it immediately? 
                                                // Actually ai-sdk usually shows result when done.
                                                // But for "generative UI" we often render on 'call' args too? 
                                                // Let's assume the model calls it with args and we display it.
                                                // Wait, streamText tools return a result. 
                                                // But here the "tool" IS the display. The backend doesn't necessarily return a result 
                                                // other than "displayed". So we should render based on 'args'.
                                                const args = toolInvocation.args;

                                                if (toolName === 'displayStockPrice') {
                                                    return (
                                                        <div key={toolCallId} className="mt-4">
                                                            <StockPriceCard {...args} />
                                                        </div>
                                                    );
                                                }
                                                if (toolName === 'displayNews') {
                                                    return (
                                                        <div key={toolCallId} className="mt-4">
                                                            <NewsCard {...args} />
                                                        </div>
                                                    );
                                                }
                                                if (toolName === 'displayFinancials') {
                                                    return (
                                                        <div key={toolCallId} className="mt-4">
                                                            <FinancialsCard {...args} />
                                                        </div>
                                                    );
                                                }
                                            } else {
                                                // Loading state for tools (optional)
                                                return (
                                                    <div key={toolCallId} className="mt-4">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Generating {toolName}...
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Card - Sticky Floating Card */}
                <div className="sticky bottom-6 z-50 w-full px-4">
                    <form
                        onSubmit={handleSubmit}
                        className="max-w-2xl mx-auto relative flex flex-col gap-2 rounded-xl border border-black/5 bg-white/30 backdrop-blur-xl px-4 py-3.5 dark:border-white/5 dark:bg-[#121417]/30 shadow-2xl transition-shadow"
                    >
                        <div className="hidden dark:block absolute -top-px left-0 z-10 h-px w-52 opacity-80"
                            style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                        />
                        <div className="hidden dark:block absolute -bottom-px right-0 z-10 h-px w-52 opacity-80"
                            style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                        />

                        <textarea
                            placeholder={t('inputPlaceholder')}
                            rows={1}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className="w-full bg-transparent text-base text-foreground placeholder-muted-foreground focus:outline-none resize-none min-h-[50px] max-h-[200px] px-2"
                        />

                        <div className="flex items-center justify-between px-2">
                            <div className="text-xs text-muted-foreground hidden sm:block">
                                Press Enter to send, Shift + Enter for new line
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                                        input.trim() && !isLoading
                                            ? "bg-pink-500 hover:bg-pink-600 text-white shadow-sm"
                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                    )}
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
