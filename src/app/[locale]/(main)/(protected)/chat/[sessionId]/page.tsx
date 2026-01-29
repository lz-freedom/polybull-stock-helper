'use client';

import { Suspense, use, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Send,
    MessageSquare,
    Plus,
    Bot,
    User as UserIcon,
    Sparkles,
    ChevronDown,
    Loader2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatSession, ChatMessage } from '@/lib/db/schema';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageWithStatus extends ChatMessage {
    isStreaming?: boolean;
    error?: boolean;
}

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

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/${locale}/sign-in`);
        }
    }, [status, router, locale]);

    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [messages, setMessages] = useState<MessageWithStatus[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasTriggeredAutoSend = useRef(false);
    const searchParams = useSearchParams();
    const initialPrompt = searchParams.get('initial_prompt');

    // Auto-scroll to bottom
    useEffect(() => {
        if (messages.length >= 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Load current session messages
    const loadSessionMessages = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/agents/chat?action=get_messages&session_id=${id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Failed to load messages', error);
        } finally {
            setIsLoading(false);
        }
    }, []); // Removed fetchSessions dependency

    useEffect(() => {
        if (sessionId) {
            loadSessionMessages(sessionId);
        }
    }, [sessionId, loadSessionMessages]);

    const handleSend = useCallback(async (prompt?: string) => {
        const content = prompt || inputValue;
        if (!content.trim()) return;

        if (!prompt) setInputValue('');
        setIsLoading(true);

        const aiMsgId = Date.now();

        // Optimistic UI update
        setMessages(prev => [
            ...prev,
            {
                id: Date.now() - 1,
                sessionId: sessionId,
                role: 'user',
                content: content,
                createdAt: new Date(),
                metadata: null,
                agentRunId: null,
                referencedReportIds: null
            },
            {
                id: aiMsgId,
                sessionId: sessionId,
                role: 'assistant',
                content: '',
                createdAt: new Date(),
                metadata: null,
                agentRunId: null,
                referencedReportIds: null,
                isStreaming: true
            }
        ]);

        try {
            const response = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_message',
                    session_id: sessionId,
                    content: content
                })
            });

            if (!response.ok) throw new Error('Failed to send message');
            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = '';
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.trim() || !line.startsWith('data: ')) continue;

                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.text) {
                                aiContent += parsed.text;
                                setMessages(prev => prev.map(msg =>
                                    msg.id === aiMsgId ? { ...msg, content: aiContent } : msg
                                ));
                            }
                        } catch (e) {
                            console.warn('Failed to parse stream chunk:', data);
                        }
                    }
                }
            } catch (readError) {
                console.error('Stream reading failed:', readError);
            }

            setMessages(prev => prev.map(msg =>
                msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
            ));

            // Note: We used to refresh sessions here, but now SWR handles it in the sidebar or we ignore it within this component.

        } catch (error) {
            console.error('Failed to send message', error);
            setMessages(prev => [...prev, {
                id: Date.now(),
                sessionId: sessionId,
                role: 'system',
                content: 'Error: Failed to get response.',
                createdAt: new Date(),
                error: true
            } as MessageWithStatus]);
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, sessionId]); // Removed fetchSessions dependency

    // Handle initial prompt from URL
    useEffect(() => {
        // Only trigger if we have a prompt, haven't triggered yet, and messages are empty.
        // We do NOT check !isLoading here to ensure it queues up immediately after mount/history-check.
        // Actually, best to wait for hydration/mount.
        if (initialPrompt && !hasTriggeredAutoSend.current && messages.length === 0) {
            console.log('[Chat] Found initial prompt, triggering auto-send:', initialPrompt);
            hasTriggeredAutoSend.current = true;
            // Removed router.replace to check if it interferes with state. 
            // We can live with the dirty URL for now to ensure stability.
            handleSend(initialPrompt);
        }
    }, [initialPrompt, handleSend, messages.length]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
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
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-20">
                                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                            </div>
                        )}

                        {messages.map((msg) => (
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
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed break-words",
                                            msg.role === 'user' ? "prose-p:m-0" : ""
                                        )}>
                                            {msg.content}
                                            {msg.isStreaming && (
                                                <span className="inline-block w-2 h-4 ml-1 align-middle bg-pink-500 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Card - Sticky Floating Card */}
                <div className="sticky bottom-6 z-50 w-full px-4">
                    <div className="max-w-2xl mx-auto relative flex flex-col gap-2 rounded-xl border border-black/5 bg-white/30 backdrop-blur-xl px-4 py-3.5 dark:border-white/5 dark:bg-[#121417]/30 shadow-2xl transition-shadow">
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
                            disabled={isLoading}
                            className="w-full bg-transparent text-base text-foreground placeholder-muted-foreground focus:outline-none resize-none min-h-[50px] max-h-[200px] px-2"
                        />

                        <div className="flex items-center justify-between px-2">
                            <div className="text-xs text-muted-foreground hidden sm:block">
                                Press Enter to send, Shift + Enter for new line
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleSend()}
                                    disabled={!inputValue.trim() || isLoading}
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                                        inputValue.trim()
                                            ? "bg-pink-500 hover:bg-pink-600 text-white shadow-sm"
                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                    )}
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
