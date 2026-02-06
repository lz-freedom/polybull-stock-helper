'use client';

import { cn } from '@/lib/utils';

interface PartnerMarqueeProps {
    title: string;
    logos: string[];
}

export function PartnerMarquee({ title, logos }: PartnerMarqueeProps) {
    return (
        <section className="bg-muted/30 py-24">
            <div className="mx-auto max-w-7xl px-6">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground mb-12">
                    {title}
                </p>
        
                <div
                    className="mask-edge-soft relative w-full overflow-hidden"
                >
                    <div className="flex w-max min-w-full animate-infinite-scroll gap-8 py-4">
                        {[...logos, ...logos, ...logos].map((logo, i) => (
                            <div 
                                key={`${logo}-${i}`}
                                className={cn(
                                    'flex h-24 w-48 items-center justify-center rounded-xl border border-border/50 bg-card p-6 shadow-lg transition-all duration-300',
                                    'hover:border-primary/20 hover:shadow-xl hover:-translate-y-1',
                                    'dark:bg-card/5',
                                )}
                            >
                                <span className="text-xl font-bold text-foreground/80">{logo}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
