'use client';

import { use, useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Plus, RefreshCw, Bot, User as UserIcon, TrendingUp } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { cn } from '@/features/shared/lib/utils';
import { ChatSession, ChatMessage } from '@/lib/db/schema';

type MessageWithStatus = ChatMessage & {
    isStreaming?: boolean;
    error?: boolean;
};

interface ChatPageProps {
    params: Promise<{ locale: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
    const { locale } = use(params);

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<MessageWithStatus[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [stockSymbol, setStockSymbol] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/agents/chat?action=get_user_sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
                if (data.sessions?.length > 0 && !currentSessionId) {
                    selectSession(data.sessions[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch sessions', error);
        }
    };

    const selectSession = async (session: ChatSession) => {
        setCurrentSessionId(session.id);
        setIsLoading(true);
        try {
            const res = await fetch(`/api/agents/chat?action=get_messages&sessionId=${session.id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Failed to load messages', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSession = async () => {
        if (!stockSymbol.trim()) return;
        
        setIsCreatingSession(true);
        try {
            const res = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'create_session', 
                    stockSymbol: stockSymbol.toUpperCase(),
                    title: `Analysis: ${stockSymbol.toUpperCase()}`
                })
            });
            
            if (res.ok) {
                const newSession = await res.json();
                setSessions([newSession, ...sessions]);
                setCurrentSessionId(newSession.id);
                setMessages([]);
                setStockSymbol('');
            }
        } catch (error) {
            console.error('Failed to create session', error);
        } finally {
            setIsCreatingSession(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !currentSessionId) return;

        const userMsg: MessageWithStatus = {
            id: Date.now(),
            sessionId: currentSessionId,
            role: 'user',
            content: inputValue,
            createdAt: new Date(),
            metadata: null,
            agentRunId: null,
            referencedReportIds: null
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_message',
                    sessionId: currentSessionId,
                    content: userMsg.content
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            if (!response.body) throw new Error('No body in response');

            const aiMsgId = Date.now() + 1;
            setMessages(prev => [...prev, {
                id: aiMsgId,
                sessionId: currentSessionId,
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

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                aiContent += chunk;

                setMessages(prev => prev.map(msg => 
                    msg.id === aiMsgId 
                        ? { ...msg, content: aiContent } 
                        : msg
                ));
            }

            setMessages(prev => prev.map(msg => 
                msg.id === aiMsgId 
                    ? { ...msg, isStreaming: false } 
                    : msg
            ));

        } catch (error) {
            console.error('Failed to send message', error);
            setMessages(prev => [...prev, {
                id: Date.now(),
                sessionId: currentSessionId,
                role: 'system',
                content: 'Error: Failed to get response from agent.',
                createdAt: new Date(),
                metadata: null,
                agentRunId: null,
                referencedReportIds: null,
                error: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
            <div className="w-80 border-r bg-muted/10 flex flex-col hidden md:flex">
                <div className="p-4 border-b">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold tracking-tight mb-2">Market Analysis</h2>
                        <p className="text-xs text-muted-foreground">
                            AI-powered stock insights & research
                        </p>
                    </div>
                    
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Stock (e.g. AAPL)" 
                            value={stockSymbol}
                            onChange={(e) => setStockSymbol(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                            className="bg-background"
                        />
                        <Button 
                            size="icon" 
                            onClick={handleCreateSession}
                            disabled={isCreatingSession || !stockSymbol}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => selectSession(session)}
                            className={cn(
                                "w-full text-left px-3 py-3 rounded-md text-sm transition-colors flex items-center gap-3",
                                currentSessionId === session.id 
                                    ? "bg-primary/10 text-primary font-medium" 
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                currentSessionId === session.id ? "bg-primary/20" : "bg-muted"
                            )}>
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="truncate">{session.title || `Session ${session.id}`}</div>
                                <div className="text-xs opacity-70 truncate">
                                    {session.stockSymbol} • {new Date(session.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </button>
                    ))}
                    
                    {sessions.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No active sessions
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {currentSessionId ? (
                    <>
                        <div className="h-14 border-b flex items-center justify-between px-6 bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="font-semibold">
                                    {sessions.find(s => s.id === currentSessionId)?.title}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground font-mono">
                                    LIVE
                                </span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
                                    <Bot className="h-12 w-12" />
                                    <p>Ask anything about {sessions.find(s => s.id === currentSessionId)?.stockSymbol}</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex gap-4 max-w-3xl",
                                            msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                                            msg.role === 'user' 
                                                ? "bg-primary text-primary-foreground border-primary" 
                                                : "bg-muted text-foreground border-border"
                                        )}>
                                            {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        </div>
                                        
                                        <div className={cn(
                                            "rounded-2xl px-5 py-3 text-sm shadow-sm",
                                            msg.role === 'user'
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-card border text-card-foreground rounded-tl-sm"
                                        )}>
                                            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                                {msg.content}
                                                {msg.isStreaming && (
                                                    <span className="inline-block w-2 h-4 ml-1 align-middle bg-current animate-pulse" />
                                                )}
                                            </div>
                                            {msg.createdAt && (
                                                <div className={cn(
                                                    "text-[10px] mt-2 opacity-70 text-right",
                                                    msg.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                                                )}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t bg-background/95 backdrop-blur support-[backdrop-filter]:bg-background/60">
                            <div className="max-w-3xl mx-auto relative flex gap-2">
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Type your question..."
                                    className="flex-1 pr-12 py-6 shadow-sm resize-none"
                                    disabled={isLoading}
                                />
                                <Button 
                                    onClick={handleSendMessage} 
                                    disabled={!inputValue.trim() || isLoading}
                                    className="absolute right-1 top-1 bottom-1 aspect-square h-auto"
                                    size="icon"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-center text-xs text-muted-foreground mt-2">
                                AI insights may vary. Always verify financial data.
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                        <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="h-12 w-12 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Select or Start a Session</h2>
                        <p className="text-muted-foreground max-w-md">
                            Choose an existing stock analysis session from the sidebar, or enter a stock symbol to start a new deep-dive analysis.
                        </p>
                        <div className="w-full max-w-xs space-y-2">
                             <div className="flex gap-2">
                                <Input 
                                    placeholder="Stock Symbol (e.g. TSLA)" 
                                    value={stockSymbol}
                                    onChange={(e) => setStockSymbol(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                                    className="text-center uppercase"
                                />
                            </div>
                            <Button 
                                className="w-full" 
                                size="lg" 
                                onClick={handleCreateSession}
                                disabled={isCreatingSession || !stockSymbol}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Start New Analysis
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
