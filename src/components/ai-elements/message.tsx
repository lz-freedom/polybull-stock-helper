'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MessageProps = HTMLAttributes<HTMLDivElement> & {
    from?: 'user' | 'assistant';
};

type MessageResponseProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
};

export function Message({ from = 'assistant', className, ...props }: MessageProps) {
    return (
        <div
            data-from={from}
            className={cn(
                'flex w-full justify-start',
                className,
            )}
            {...props}
        />
    );
}

export function MessageContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm',
                'data-[from=user]:border-border data-[from=user]:bg-muted data-[from=user]:text-foreground',
                'data-[from=assistant]:border-border data-[from=assistant]:bg-card data-[from=assistant]:text-foreground',
                'dark:data-[from=user]:border-border dark:data-[from=user]:bg-card dark:data-[from=user]:text-foreground',
                'dark:data-[from=assistant]:border-border dark:data-[from=assistant]:bg-card dark:data-[from=assistant]:text-foreground',
                className,
            )}
            {...props}
        />
    );
}

export function MessageResponse({ className, ...props }: MessageResponseProps) {
    return (
        <div className={cn('leading-relaxed', className)} {...props} />
    );
}
