'use client';

import { use, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface ChatNewPageProps {
    params: Promise<{ locale: string }>;
}

function buildSessionTitle(prompt: string | null) {
    if (!prompt) return '新对话';
    const trimmed = prompt.trim();
    if (!trimmed) return '新对话';
    return trimmed.length > 50 ? `${trimmed.slice(0, 50)}...` : trimmed;
}

export default function ChatNewPage({ params }: ChatNewPageProps) {
    const { locale } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const creatingRef = useRef(false);
    const initialPrompt = searchParams.get('initial_prompt');
    const mode = searchParams.get('mode');

    const targetQuery = useMemo(() => {
        const query = new URLSearchParams();
        if (initialPrompt?.trim()) query.set('initial_prompt', initialPrompt.trim());
        if (mode?.trim()) query.set('mode', mode.trim());
        return query.toString();
    }, [initialPrompt, mode]);

    useEffect(() => {
        if (creatingRef.current) return;
        creatingRef.current = true;

        const sessionId = crypto.randomUUID();

        const createSession = async () => {
            try {
                await fetch('/api/agents/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'create_session',
                        session_id: sessionId,
                        stock_symbol: null,
                        exchange_acronym: null,
                        title: buildSessionTitle(initialPrompt),
                    }),
                });
            } catch (error) {
                console.error('create_session failed', error);
            } finally {
                const query = targetQuery ? `?${targetQuery}` : '';
                router.replace(`/${locale}/chat/${sessionId}${query}`);
            }
        };

        void createSession();
    }, [initialPrompt, locale, router, targetQuery]);

    return (
        <div className="flex h-[calc(100vh-6rem)] w-full items-center justify-center">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在创建会话...</span>
            </div>
        </div>
    );
}
