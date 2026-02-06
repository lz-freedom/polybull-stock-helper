import { CalloutBlock } from '@/features/agents/lib/schemas';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface CalloutBlockProps {
    block: CalloutBlock;
}

const intentStyles = {
    info: 'bg-info/10 text-info border-info/30 dark:bg-info/10 dark:text-info dark:border-info/30',
    warning: 'bg-warning/10 text-warning border-warning/30 dark:bg-warning/10 dark:text-warning dark:border-warning/30',
    success: 'bg-success/10 text-success border-success/30 dark:bg-success/10 dark:text-success dark:border-success/30',
    danger: 'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/10 dark:text-destructive dark:border-destructive/30',
    neutral: 'bg-muted text-muted-foreground border-border',
};

const intentIcons = {
    info: Info,
    warning: AlertCircle,
    success: CheckCircle2,
    danger: XCircle,
    neutral: Info,
};

export function CalloutBlockComponent({ block }: CalloutBlockProps) {
    const Icon = intentIcons[block.intent] || Info;

    return (
        <div
            className={cn(
                'p-4 rounded-lg border flex items-start gap-3 mb-6',
                intentStyles[block.intent],
            )}
        >
            <Icon className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="space-y-1">
                {block.title && (
                    <h4 className="font-semibold">{block.title}</h4>
                )}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {block.content}
                </div>
            </div>
        </div>
    );
}
