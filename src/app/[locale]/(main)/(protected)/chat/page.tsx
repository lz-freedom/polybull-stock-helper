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
    BarChart3, 
    FileText, 
    Sparkles,
    ChevronDown
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatSession, ChatMessage } from '@/lib/db/schema';
import { ReportViewer } from '@/features/agents/components/report-viewer';
import { startConsensusRun, startResearchRun } from '@/features/agents/actions';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AgentType = 'qa' | 'consensus' | 'research';

interface MessageWithStatus extends ChatMessage {
    isStreaming?: boolean;
    error?: boolean;
}

interface ChatPageProps {
    params: Promise<{ locale: string }>;
}

const AGENT_OPTIONS = [
    { value: 'qa', label: 'QA 问答', icon: MessageSquare },
    { value: 'consensus', label: '共识分析', icon: BarChart3 },
    { value: 'research', label: '深度研究', icon: FileText },
];

export default function ChatPage({ params }: ChatPageProps) {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <ChatPageContent params={params} />
        </Suspense>
    );
}

function ChatPageContent({ params }: ChatPageProps) {
    const { locale } = use(params);
    const searchParams = useSearchParams();
    const router = useRouter();
    const { status } = useSession();
    const t = useTranslations('home'); 

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/${locale}/sign-in`);
        }
    }, [status, router, locale]);

    const agentTypeParam = searchParams.get('type') as AgentType | null;
    const sessionIdParam = searchParams.get('sessionId');
    const initialPromptParam = searchParams.get('initialPrompt');
    const missingSessionId = !sessionIdParam;

    useEffect(() => {
        if (missingSessionId) {
            router.replace(`/${locale}`);
        }
    }, [missingSessionId, router, locale]);

    const [agentType, setAgentType] = useState<AgentType>(agentTypeParam || 'qa');
    const [inputValue, setInputValue] = useState(initialPromptParam || '');
    const [isLoading, setIsLoading] = useState(false);
    
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(sessionIdParam ? parseInt(sessionIdParam) : null);
    const [messages, setMessages] = useState<MessageWithStatus[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasTriggeredAutoSend = useRef(false);

    const [runId, setRunId] = useState<number | null>(null);
    const [runError, setRunError] = useState<string | null>(null);

    useEffect(() => {
        if (agentTypeParam && agentTypeParam !== agentType) {
            setAgentType(agentTypeParam);
        }
    }, [agentTypeParam, agentType]);

    useEffect(() => {
        if (messages.length >= 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch('/api/agents/chat?action=get_user_sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (error) {
            console.error('Failed to fetch sessions', error);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const loadSessionMessages = useCallback(async (id: number) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/agents/chat?action=get_messages&sessionId=${id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Failed to load messages', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentSessionId) {
            loadSessionMessages(currentSessionId);
        }
    }, [currentSessionId, loadSessionMessages]);

    const handleSend = useCallback(async () => {
        if (!inputValue.trim() || isLoading) return;
        const content = inputValue.trim();
        setInputValue('');

        if (agentType === 'qa') {
            const sessionId = currentSessionId;
            if (!sessionId) {
                router.replace(`/${locale}`);
                return;
            }

            const userMsg: MessageWithStatus = {
                id: Date.now(),
                sessionId: sessionId!,
                role: 'user',
                content: content,
                createdAt: new Date(),
                metadata: null,
                agentRunId: null,
                referencedReportIds: null
            };
            setMessages(prev => [...prev, userMsg]);
            setIsLoading(true);

            try {
                const response = await fetch('/api/agents/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'send_message',
                        sessionId: sessionId,
                        content: content
                    })
                });

                if (!response.ok) throw new Error('Network response was not ok');
                if (!response.body) throw new Error('No body in response');

                const aiMsgId = Date.now() + 1;
                setMessages(prev => [...prev, {
                    id: aiMsgId,
                    sessionId: sessionId!,
                    role: 'assistant',
                    content: '',
                    createdAt: new Date(),
                    metadata: null,
                    agentRunId: null,
                    referencedReportIds: null,
                    isStreaming: true
                }]);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let aiContent = '';
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.text) aiContent += parsed.text;
                            } catch {
                                aiContent += data;
                            }
                        }
                    }

                    setMessages(prev => prev.map(msg => 
                        msg.id === aiMsgId ? { ...msg, content: aiContent } : msg
                    ));
                }

                setMessages(prev => prev.map(msg => 
                    msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
                ));

            } catch (error) {
                console.error('Failed to send message', error);
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    sessionId: sessionId!,
                    role: 'system',
                    content: 'Error: Failed to get response.',
                    createdAt: new Date(),
                    error: true
                } as MessageWithStatus]);
            } finally {
                setIsLoading(false);
            }

        } else {
            setIsLoading(true);
            setRunError(null);
            setRunId(null);
            
            try {
                const formData = new FormData();
                formData.append('stockSymbol', content.toUpperCase());
                formData.append('exchangeAcronym', 'NASDAQ');
                
                if (agentType === 'research') {
                    formData.append('query', content);
                    const result = await startResearchRun({}, formData);
                    if ('error' in result && result.error) setRunError(result.error);
                    else if ('runId' in result && result.runId) setRunId(result.runId);
                } else {
                    const result = await startConsensusRun({}, formData);
                    if ('error' in result && result.error) setRunError(result.error);
                    else if ('runId' in result && result.runId) setRunId(result.runId);
                }
            } catch (error) {
                setRunError(error instanceof Error ? error.message : 'Failed to start');
            } finally {
                setIsLoading(false);
            }
        }
    }, [inputValue, isLoading, agentType, currentSessionId, locale, router]);

    useEffect(() => {
        if (missingSessionId) return;
        if (initialPromptParam && !hasTriggeredAutoSend.current && inputValue) {
            hasTriggeredAutoSend.current = true;
            handleSend();
        }
    }, [initialPromptParam, inputValue, handleSend, missingSessionId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const currentAgent = AGENT_OPTIONS.find(a => a.value === agentType) || AGENT_OPTIONS[0];

    if (missingSessionId) {
        return null;
    }

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
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px,minmax(0,1fr)] gap-6 min-h-0">
                
                {/* Left Column: Sessions */}
                <div className="flex flex-col rounded-[14px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121417] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                        <span className="font-semibold text-sm">History</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                router.push(`/${locale}`);
                            }}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                        {sessions.map((session) => (
                            <button
                                key={session.id}
                                type="button"
                                onClick={() => {
                                    setCurrentSessionId(session.id);
                                    setRunId(null);
                                    setAgentType('qa');
                                }}
                                className={cn(
                                    "w-full text-left px-3 py-2 rounded-md text-sm transition-all truncate flex items-center gap-2",
                                    currentSessionId === session.id 
                                        ? "bg-black/5 dark:bg-white/10 font-medium text-foreground" 
                                        : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                                )}
                            >
                                <MessageSquare className="h-3.5 w-3.5 opacity-70" />
                                <span className="truncate">{session.title || `Session ${session.id}`}</span>
                            </button>
                        ))}
                        {sessions.length === 0 && (
                            <div className="text-center py-8 text-xs text-muted-foreground">
                                No recent chats
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Chat Area */}
                <div className="flex flex-col rounded-[14px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121417] shadow-sm overflow-hidden relative">
                    <div className="hidden dark:block absolute -top-px left-0 z-10 h-px w-52 opacity-80"
                        style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                    />
                    <div className="hidden dark:block absolute -bottom-px right-0 z-10 h-px w-52 opacity-80"
                        style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                    />

                    {runId ? (
                        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin p-4">
                            <div className="mb-4">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setRunId(null)}
                                    className="gap-2 text-muted-foreground hover:text-foreground"
                                >
                                    &larr; Back to Chat
                                </Button>
                            </div>
                            <ReportViewer
                                agentRunId={runId}
                                agentType={agentType as 'consensus'|'research'}
                                isStreaming={true}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto min-h-0 space-y-6 p-4 scrollbar-thin">
                            {messages.length === 0 && !currentSessionId && (
                                <div className="h-full flex flex-col items-center justify-center space-y-4">
                                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/25">
                                        <Sparkles className="h-8 w-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-semibold">How can I help you?</h2>
                                </div>
                            )}

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
                                            : "bg-gray-100 dark:bg-zinc-800 text-foreground border-black/5 dark:border-white/10"
                                    )}>
                                        {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    
                                    <div className={cn(
                                        "rounded-2xl px-5 py-3 text-sm shadow-sm max-w-[85%]",
                                        msg.role === 'user'
                                            ? "bg-pink-500 text-white rounded-tr-sm"
                                            : "bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-foreground rounded-tl-sm"
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
                </div>
            </div>

            {/* Input Card */}
            <div className="shrink-0 relative flex flex-col gap-2 rounded-[14px] border border-black/10 bg-white px-4 py-3.5 backdrop-blur-[8px] dark:border-white/10 dark:bg-[#121417] shadow-sm transition-shadow hover:shadow-md">
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
                                    onClick={() => setAgentType(option.value as AgentType)}
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
            
            {runError && (
                <p className="text-xs text-red-500 mt-2 text-center">{runError}</p>
            )}
        </div>
    );
}
