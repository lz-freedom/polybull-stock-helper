'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    ChevronDown,
    Circle,
    Loader2,
} from 'lucide-react';

type ChainStatus = 'complete' | 'active' | 'pending';

type ChainOfThoughtProps = HTMLAttributes<HTMLDivElement> & {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
};

type ChainOfThoughtHeaderProps = HTMLAttributes<HTMLButtonElement> & {
    children?: ReactNode;
};

type ChainOfThoughtStepProps = HTMLAttributes<HTMLDivElement> & {
    label: string;
    description?: string;
    status?: ChainStatus;
    icon?: React.ComponentType<{ className?: string }>;
    children?: ReactNode;
};

type ChainOfThoughtImageProps = HTMLAttributes<HTMLDivElement> & {
    caption?: string;
    children: ReactNode;
};

export function ChainOfThought({
    open,
    defaultOpen = false,
    onOpenChange,
    className,
    ...props
}: ChainOfThoughtProps) {
    return (
        <Collapsible
            open={open}
            defaultOpen={defaultOpen}
            onOpenChange={onOpenChange}
            className={cn(
                'rounded-2xl border border-border bg-muted/80 text-foreground shadow-sm dark:bg-card/60 dark:text-foreground',
                className,
            )}
            {...props}
        />
    );
}

export function ChainOfThoughtHeader({
    children,
    className,
    ...props
}: ChainOfThoughtHeaderProps) {
    return (
        <CollapsibleTrigger
            className={cn(
                'group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground transition hover:text-foreground dark:hover:text-primary-foreground',
                className,
            )}
            {...props}
        >
            <div className="flex min-w-0 items-center gap-2">
                {children ?? '思维链'}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
    );
}

export function ChainOfThoughtContent({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <CollapsibleContent
            className={cn(
                'border-t border-border px-4 pb-4 pt-3 text-sm text-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
                className,
            )}
            {...props}
        />
    );
}

export function ChainOfThoughtRail({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'relative ml-2 border-l border-border pl-3',
                className,
            )}
            {...props}
        />
    );
}

const statusStyles: Record<ChainStatus, { icon: ReactNode; ring: string; text: string }> = {
    complete: {
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
        ring: 'bg-success/10 text-success dark:bg-success/10 dark:text-success',
        text: '已完成',
    },
    active: {
        icon: <Loader2 className="h-4 w-4 animate-spin text-info" />,
        ring: 'bg-info/10 text-info dark:bg-info/10 dark:text-info',
        text: '进行中',
    },
    pending: {
        icon: <Circle className="h-4 w-4 text-muted-foreground" />,
        ring: 'bg-muted text-muted-foreground dark:bg-card',
        text: '等待中',
    },
};

export function ChainOfThoughtStep({
    label,
    description,
    status = 'complete',
    icon: Icon,
    className,
    children,
    ...props
}: ChainOfThoughtStepProps) {
    const statusMeta = statusStyles[status];
    return (
        <div
            className={cn(
                'relative flex gap-3 pb-4 pl-6 last:pb-0',
                className,
            )}
            {...props}
        >
            <div className="absolute left-[-2px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted dark:bg-card">
                {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : statusMeta.icon}
            </div>
            <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground dark:text-foreground">
                    <span>{label}</span>
                    <Badge variant="outline" className={cn('text-[10px]', statusMeta.ring)}>
                        {statusMeta.text}
                    </Badge>
                </div>
                {description ? (
                    <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
                {children}
            </div>
        </div>
    );
}

export function ChainOfThoughtSearchResults({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex flex-wrap gap-2', className)} {...props} />
    );
}

export function ChainOfThoughtSearchResult({
    className,
    ...props
}: HTMLAttributes<HTMLSpanElement>) {
    return (
        <Badge
            variant="secondary"
            className={cn('rounded-full bg-muted text-muted-foreground dark:bg-card', className)}
            {...props}
        />
    );
}

export function ChainOfThoughtImage({
    caption,
    className,
    children,
    ...props
}: ChainOfThoughtImageProps) {
    return (
        <div className={cn('space-y-2', className)} {...props}>
            <div className="overflow-hidden rounded-xl border border-border bg-card p-2 dark:bg-card">
                {children}
            </div>
            {caption ? (
                <p className="text-xs text-muted-foreground">{caption}</p>
            ) : null}
        </div>
    );
}
