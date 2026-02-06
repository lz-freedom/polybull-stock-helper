import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, User as UserIcon } from 'lucide-react';

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatStreamProps extends React.HTMLAttributes<HTMLDivElement> {
    messages: Message[];
    isThinking?: boolean;
}

export function ChatStream({ messages, isThinking, className, ...props }: ChatStreamProps) {
    return (
        <div className={cn('flex flex-col gap-6 pb-32 pt-10', className)} {...props}>
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={cn(
                        'mx-auto flex w-full max-w-3xl gap-4 px-4',
                        message.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                >
                    {message.role === 'assistant' && (
                        <Avatar className="mt-1 h-8 w-8 shrink-0 border bg-card shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-info text-primary-foreground">
                                <Sparkles className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                    )}

                    <div className={cn(
                        'relative max-w-[85%] px-5 py-3 text-sm leading-relaxed shadow-sm',
                        message.role === 'user'
                            ? 'rounded-2xl rounded-tr-sm bg-muted text-foreground'
                            : 'rounded-2xl rounded-tl-sm border border-border bg-card text-foreground',
                    )}>
                        <div className="prose prose-sm max-w-none break-words whitespace-pre-wrap dark:prose-invert">
                            {message.content}
                        </div>
                    </div>

                    {message.role === 'user' && (
                        <Avatar className="mt-1 h-8 w-8 shrink-0 border shadow-sm">
                            <AvatarImage src="/placeholder-user.jpg" alt="@user" />
                            <AvatarFallback className="bg-muted text-muted-foreground">
                                <UserIcon className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                    )}
                </div>
            ))}

            {isThinking && (
                <div className="mx-auto flex w-full max-w-3xl justify-start gap-4 px-4">
                    <Avatar className="mt-1 h-8 w-8 shrink-0 animate-pulse border bg-card shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-info text-primary-foreground">
                            <Sparkles className="h-4 w-4" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border bg-card px-5 py-4 shadow-sm">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                    </div>
                </div>
            )}
        </div>
    );
}
