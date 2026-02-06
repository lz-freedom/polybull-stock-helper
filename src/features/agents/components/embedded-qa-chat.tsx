'use client';

// ============================================================
// EmbeddedQAChat - 嵌入式 QA 聊天组件
// 在报告页面中提供上下文感知的问答功能
// 支持 referencedReportIds 关联报告上下文
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User as UserIcon, MessageSquare, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// 消息类型定义
interface ChatMessage {
    id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
    isStreaming?: boolean;
    error?: boolean;
}

// 组件属性定义
interface EmbeddedQAChatProps {
    /** 关联的报告 ID，用于 API 请求上下文 */
    reportId: string;
    /** 股票代码，用于创建 session 和显示 */
    stockSymbol?: string;
    /** 自定义样式类名 */
    className?: string;
    /** 面板位置: 'bottom' 底部弹出 | 'side' 侧边面板 */
    position?: 'bottom' | 'side';
    /** 初始是否展开 */
    defaultExpanded?: boolean;
}

/**
 * EmbeddedQAChat - 嵌入式问答聊天组件
 * 
 * 用途:
 * - 在报告查看页面中嵌入，提供基于报告上下文的 QA 功能
 * - 支持流式响应
 * - 自动关联 referencedReportIds 发送给后端 API
 * 
 * API 集成:
 * - POST /api/agents/chat { action: 'send_message', sessionId, content, referencedReportIds }
 * - 后端已支持 referencedReportIds 参数
 */
export function EmbeddedQAChat({
    reportId,
    stockSymbol,
    className,
    position = 'bottom',
    defaultExpanded = false,
}: EmbeddedQAChatProps) {
    // === 状态管理 ===
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 消息容器 ref，用于自动滚动
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        if (isExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isExpanded]);

    // 创建或获取 chat session
    const initSession = useCallback(async () => {
        if (sessionId || isInitializing) return;
        
        setIsInitializing(true);
        setError(null);
        
        try {
            const res = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_session',
                    stockSymbol: stockSymbol || 'CONTEXT',
                    title: `Report QA: ${stockSymbol || reportId}`,
                }),
            });

            if (!res.ok) throw new Error('Failed to create session');
            
            const data = await res.json();
            if (data.success && data.session) {
                setSessionId(data.session.id);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (err) {
            console.error('Failed to initialize chat session:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize chat');
        } finally {
            setIsInitializing(false);
        }
    }, [sessionId, isInitializing, stockSymbol, reportId]);

    // 展开时自动初始化 session
    useEffect(() => {
        if (isExpanded && !sessionId && !isInitializing) {
            initSession();
        }
    }, [isExpanded, sessionId, isInitializing, initSession]);

    // 发送消息
    const handleSendMessage = async () => {
        if (!inputValue.trim() || !sessionId || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now(),
            role: 'user',
            content: inputValue.trim(),
            createdAt: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            // 发送消息，附带 referencedReportIds 关联报告上下文
            const parsedReportId = Number(reportId);
            const response = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_message',
                    sessionId,
                    content: userMessage.content,
                    ...(Number.isFinite(parsedReportId) && { referencedReportIds: [parsedReportId] }),
                }),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            if (!response.body) throw new Error('No body in response');

            // 创建 AI 回复消息 (流式)
            const aiMsgId = Date.now() + 1;
            setMessages(prev => [...prev, {
                id: aiMsgId,
                role: 'assistant',
                content: '',
                createdAt: new Date(),
                isStreaming: true,
            }]);

            // 读取流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                
                // 解析 SSE 格式: "data: {...}\n\n"
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.text) {
                                aiContent += parsed.text;
                            }
                        } catch {
                            // 非 JSON 格式，直接追加
                            aiContent += data;
                        }
                    }
                }

                // 更新消息内容
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId
                        ? { ...msg, content: aiContent }
                        : msg,
                ));
            }

            // 结束流式状态
            setMessages(prev => prev.map(msg =>
                msg.id === aiMsgId
                    ? { ...msg, isStreaming: false }
                    : msg,
            ));

        } catch (err) {
            console.error('Failed to send message:', err);
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'system',
                content: '发送消息失败，请重试',
                createdAt: new Date(),
                error: true,
            }]);
            setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setIsLoading(false);
        }
    };

    // 切换展开/收起
    const toggleExpand = () => setIsExpanded(prev => !prev);

    // === 渲染 ===
    
    // 底部弹出样式
    if (position === 'bottom') {
        return (
            <div className={cn(
                'fixed bottom-4 right-4 z-50',
                className,
            )}>
                {/* 展开状态: 聊天面板 */}
                {isExpanded ? (
                    <div className="w-96 h-[480px] bg-background border rounded-lg shadow-xl flex flex-col overflow-hidden">
                        {/* 头部 */}
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted">
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-primary" />
                                <span className="font-medium text-sm">
                                    报告助手 {stockSymbol && `· ${stockSymbol}`}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={toggleExpand}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* 消息列表 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* 初始化中 */}
                            {isInitializing && (
                                <div className="flex items-center justify-center py-8 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span className="text-sm">初始化会话...</span>
                                </div>
                            )}

                            {/* 无消息提示 */}
                            {!isInitializing && messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center">
                                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">有关于这份报告的问题吗？</p>
                                    <p className="text-xs mt-1 opacity-70">我可以帮您解读分析内容</p>
                                </div>
                            )}

                            {/* 消息列表 */}
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        'flex gap-2',
                                        msg.role === 'user' ? 'justify-end' : 'justify-start',
                                    )}
                                >
                                    {/* 头像 */}
                                    {msg.role !== 'user' && (
                                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                                            <Bot className="h-4 w-4" />
                                        </div>
                                    )}

                                    {/* 消息气泡 */}
                                    <div className={cn(
                                        'rounded-lg px-3 py-2 text-sm max-w-[80%]',
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : msg.error
                                                ? 'bg-destructive/10 text-destructive'
                                                : 'bg-muted text-foreground',
                                    )}>
                                        <p className="whitespace-pre-wrap break-words">
                                            {msg.content}
                                            {msg.isStreaming && (
                                                <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse" />
                                            )}
                                        </p>
                                    </div>

                                    {/* 用户头像 */}
                                    {msg.role === 'user' && (
                                        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                                            <UserIcon className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* 输入区域 */}
                        <div className="p-3 border-t bg-background">
                            <div className="flex gap-2">
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="输入您的问题..."
                                    disabled={isLoading || !sessionId}
                                    className="flex-1 text-sm"
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isLoading || !sessionId}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 收起状态: 触发按钮 */
                    <Button
                        onClick={toggleExpand}
                        className="h-12 w-12 rounded-full shadow-lg"
                        size="icon"
                    >
                        <MessageSquare className="h-5 w-5" />
                    </Button>
                )}
            </div>
        );
    }

    // 侧边面板样式
    return (
        <div className={cn(
            'border-l bg-background flex flex-col h-full',
            isExpanded ? 'w-80' : 'w-12',
            className,
        )}>
            {/* 折叠按钮 */}
            <button
                type="button"
                onClick={toggleExpand}
                className="flex items-center justify-center p-3 border-b hover:bg-muted transition-colors"
            >
                {isExpanded ? (
                    <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">问答助手</span>
                    </>
                ) : (
                    <MessageSquare className="h-5 w-5" />
                )}
            </button>

            {isExpanded && (
                <>
                    {/* 消息列表 */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {isInitializing && (
                            <div className="flex items-center justify-center py-4 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span className="text-xs">初始化...</span>
                            </div>
                        )}

                        {!isInitializing && messages.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground text-xs">
                                <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-50" />
                                <p>提问关于报告的问题</p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    'text-xs p-2 rounded',
                                    msg.role === 'user'
                                        ? 'bg-primary/10 text-right'
                                        : msg.error
                                            ? 'bg-destructive/10'
                                            : 'bg-muted',
                                )}
                            >
                                {msg.content}
                                {msg.isStreaming && <span className="animate-pulse">▌</span>}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 输入 */}
                    <div className="p-2 border-t">
                        <div className="flex gap-1">
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="提问..."
                                disabled={isLoading || !sessionId}
                                className="text-xs h-8"
                            />
                            <Button
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                            >
                                <Send className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
