'use client';

import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ArrowUp, Loader2, Square } from 'lucide-react';

export type PromptInputMessage = {
    text?: string;
    files?: File[];
};

type PromptInputProps = HTMLAttributes<HTMLFormElement> & {
    onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function PromptInput({ className, onSubmit, ...props }: PromptInputProps) {
    return (
        <form
            className={cn(
                'flex w-full flex-col gap-3 rounded-3xl border border-border bg-card px-3 py-2.5 shadow-sm transition focus-within:border-ring',
                className,
            )}
            onSubmit={onSubmit}
            {...props}
        />
    );
}

export function PromptInputBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('px-2', className)} {...props} />;
}

export const PromptInputTextarea = forwardRef<HTMLTextAreaElement, React.ComponentProps<typeof Textarea>>(
    ({ className, ...props }, ref) => {
        return (
            <Textarea
                ref={ref}
                className={cn(
                    'min-h-[72px] resize-none border-0 bg-transparent px-2 py-2 text-base text-foreground shadow-none outline-none focus-visible:ring-0',
                    className,
                )}
                {...props}
            />
        );
    },
);

PromptInputTextarea.displayName = 'PromptInputTextarea';

export function PromptInputFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex items-center justify-between gap-2 px-1 pb-1', className)} {...props} />
    );
}

export function PromptInputTools({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex items-center gap-2', className)} {...props} />;
}

export function PromptInputButton({
    className,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button
            type="button"
            variant="ghost"
            className={cn('h-9 rounded-full px-3 text-sm font-medium', className)}
            {...props}
        />
    );
}

type PromptInputSubmitProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    status?: 'ready' | 'streaming' | 'submitted' | 'error';
    isRunning?: boolean;
};

export function PromptInputSubmit({
    className,
    status = 'ready',
    isRunning,
    ...props
}: PromptInputSubmitProps) {
    const showSpinner = status === 'streaming' || status === 'submitted' || isRunning;
    return (
        <Button
            type="submit"
            className={cn('h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90', className)}
            {...props}
        >
            {showSpinner ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
    );
}

export function PromptInputStop({
    className,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button
            type="button"
            variant="outline"
            className={cn('h-10 w-10 rounded-full', className)}
            {...props}
        >
            <Square className="h-3 w-3 fill-current" />
        </Button>
    );
}
