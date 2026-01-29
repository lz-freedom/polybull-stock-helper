'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Send, Bot, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ChatPageProps {
    params: Promise<{ locale: string }>;
}

export default function NewChatPage({ params }: ChatPageProps) {
    const { locale } = use(params);
    const router = useRouter();
    const { status } = useSession();
    const t = useTranslations('home');
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        setIsLoading(true);
        const content = inputValue.trim();

        try {
            // 1. Generate a client-side UUID for immediate feedback or let the server generate it?
            // The user requested: "should create a session_id (uuid) on frontend first, then request backend to create session"
            // We will follow this instructions:
            const sessionId = crypto.randomUUID();

            // 2. Call backend to create the session asynchronously
            // We await this to ensure the session is created before we navigate.
            // This prevents a race condition where the chat page tries to load a non-existent session
            // (though the chat page also attempts to auto-create, explicit creation is safer).
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
                console.error('Failed to create session on server, attempting to proceed anyway as fallback');
            }

            // 3. Navigate with snake_case query param
            router.push(`/${locale}/chat/${sessionId}?initial_prompt=${encodeURIComponent(content)}`);

        } catch (error) {
            console.error('Error starting chat:', error);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] items-center justify-center gap-8 max-w-2xl mx-auto w-full px-4">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/25">
                    <Bot className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Surf Chat</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Start a new conversation
                    </p>
                </div>
            </div>

            <div className="w-full relative flex flex-col gap-2 rounded-[14px] border border-black/10 bg-white px-4 py-3.5 backdrop-blur-[8px] dark:border-white/10 dark:bg-[#121417] shadow-sm transition-shadow hover:shadow-md">
                <div className="hidden dark:block absolute -top-px left-0 z-10 h-px w-52 opacity-80"
                    style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                />
                <div className="hidden dark:block absolute -bottom-px right-0 z-10 h-px w-52 opacity-80"
                    style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                />

                <textarea
                    placeholder={t('inputPlaceholder') || "Enter your question..."}
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none resize-none min-h-[50px] max-h-[150px]"
                    autoFocus
                />

                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                            inputValue.trim()
                                ? "bg-pink-500 hover:bg-pink-600 text-white shadow-sm"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
