import * as React from 'react';
import { Paperclip, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit?: () => void;
}

export function FloatingInput({ className, value, onChange, onSubmit, ...props }: FloatingInputProps) {
    return (
        <div className={cn('mx-auto w-full max-w-2xl px-4 pb-6', className)} {...props}>
            <div className="relative flex items-end gap-2 rounded-[2rem] border border-border bg-card p-2 shadow-2xl ring-1 ring-border transition-shadow hover:shadow-xl">
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Paperclip className="h-5 w-5" />
                    <span className="sr-only">Attach file</span>
                </Button>

                <div className="flex-1 py-3">
                    <textarea
                        className="min-h-[24px] max-h-32 w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-base leading-relaxed placeholder:text-muted-foreground/70 outline-none focus:ring-0"
                        placeholder="Message Surf..."
                        rows={1}
                        value={value}
                        onChange={onChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSubmit?.();
                            }
                        }}
                    />
                </div>

                <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-105 hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                    onClick={onSubmit}
                >
                    <ArrowUp className="h-5 w-5" />
                    <span className="sr-only">Send message</span>
                </Button>
            </div>
            <div className="mt-3 text-center">
                <p className="text-[10px] font-medium tracking-wide text-muted-foreground/50">
                    AI can make mistakes. Check important info.
                </p>
            </div>
        </div>
    );
}
