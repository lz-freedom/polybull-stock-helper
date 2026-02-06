'use client';

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface FAQProps {
    title: string;
    subtitle: string;
    items: { question: string; answer: string }[];
}

export function FAQ({ title, subtitle, items }: FAQProps) {
    return (
        <section className="relative px-6 py-24 lg:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-50" />
            <div className="relative mx-auto max-w-4xl">
                <div className="mb-16 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">{title}</p>
                    <h2 className="mt-3 text-3xl font-bold text-foreground lg:text-4xl">{subtitle}</h2>
                </div>
                <div className="space-y-4">
                    {items.map((faq, index) => (
                        <details 
                            key={index} 
                            className="group rounded-3xl border border-border/50 bg-card/50 p-6 transition-all hover:bg-card hover:shadow-lg open:bg-card open:shadow-xl dark:bg-card/5 dark:hover:bg-card/10"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-semibold text-foreground">
                                {faq.question}
                                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            <p className="mt-4 text-base leading-relaxed text-muted-foreground animate-in slide-in-from-top-2 fade-in duration-200">
                                {faq.answer}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
