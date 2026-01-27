'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Loader2, Bot, User, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@features/shared/lib/utils';

interface MastraChatProps {
    className?: string;
    stockSymbol?: string;
    exchangeAcronym?: string;
}

export function MastraChat({ className, stockSymbol, exchangeAcronym }: MastraChatProps) {
    const [input, setInput] = useState('');

    const { messages, sendMessage, regenerate, stop, status } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/mastra/chat',
            body: {
                stockSymbol,
                exchangeAcronym,
            },
        }),
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
        }
    };

    type MessagePart = (typeof messages)[number]['parts'][number];
    
    const getTextContent = (parts: MessagePart[]) => {
        return parts
            .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
            .map((part) => part.text)
            .join('');
    };

    const isToolPart = (part: MessagePart) => part.type.startsWith('tool-');

    const getToolParts = (parts: MessagePart[]) => parts.filter(isToolPart);

    return (
        <div className={cn('flex flex-col h-full', className)}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Bot className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Financial QA Agent</p>
                        <p className="text-sm">Ask me anything about stocks and financial data</p>
                        {stockSymbol && (
                            <p className="text-sm mt-2 text-orange-500">
                                Currently analyzing: {stockSymbol} ({exchangeAcronym})
                            </p>
                        )}
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            'flex gap-3 max-w-[80%]',
                            message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto',
                        )}
                    >
                        <div
                            className={cn(
                                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                                message.role === 'user'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-200 text-gray-700',
                            )}
                        >
                            {message.role === 'user' ? (
                                <User className="w-4 h-4" />
                            ) : (
                                <Bot className="w-4 h-4" />
                            )}
                        </div>
                        <div
                            className={cn(
                                'rounded-lg px-4 py-2',
                                message.role === 'user'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-900',
                            )}
                        >
                            <div className="whitespace-pre-wrap text-sm">
                                {getTextContent(message.parts)}
                            </div>

                            {getToolParts(message.parts).length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {getToolParts(message.parts).map((part, index) => {
                                        const toolName = part.type.replace('tool-', '');
                                        const toolPart = part as { 
                                            type: string; 
                                            state: string; 
                                            toolCallId: string;
                                        };
                                        
                                        return (
                                            <div
                                                key={`${toolPart.toolCallId}-${index}`}
                                                className="text-xs bg-gray-200 rounded px-2 py-1"
                                            >
                                                <span className="font-medium">Tool: </span>
                                                {toolName}
                                                {(toolPart.state === 'input-streaming' || toolPart.state === 'input-available') && (
                                                    <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />
                                                )}
                                                {toolPart.state === 'output-available' && (
                                                    <span className="ml-1 text-green-600">✓</span>
                                                )}
                                                {toolPart.state === 'output-error' && (
                                                    <span className="ml-1 text-red-600">✗</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <div className="bg-gray-100 rounded-lg px-4 py-2">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t p-4">
                <form onSubmit={handleFormSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                        placeholder={
                            stockSymbol
                                ? `Ask about ${stockSymbol}...`
                                : 'Ask about any stock...'
                        }
                        disabled={isLoading}
                        className="flex-1"
                    />
                    {isLoading ? (
                        <Button type="button" variant="outline" onClick={stop}>
                            Stop
                        </Button>
                    ) : (
                        <Button type="submit" disabled={!input.trim()}>
                            <Send className="w-4 h-4" />
                        </Button>
                    )}
                    {messages.length > 0 && !isLoading && (
                        <Button type="button" variant="outline" onClick={() => regenerate()}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    )}
                </form>
            </div>
        </div>
    );
}
