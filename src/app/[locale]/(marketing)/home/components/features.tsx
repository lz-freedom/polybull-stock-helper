import { Sparkles, LineChart, ShieldCheck, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturesProps {
    title: string;
    subtitle: string;
    items: { title: string; description: string }[];
}

export function Features({ title, subtitle, items }: FeaturesProps) {
    const icons = [Sparkles, LineChart, ShieldCheck, Radio];

    return (
        <section className="bg-secondary/10 px-6 py-24 dark:bg-background">
            <div className="mx-auto max-w-7xl">
                <div className="mb-20 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">{title}</p>
                    <h2 className="mt-3 text-3xl font-bold text-foreground lg:text-4xl">{subtitle}</h2>
                </div>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {items.map((feature, index) => {
                        const Icon = icons[index % icons.length];
                        return (
                            <div 
                                key={feature.title} 
                                className={cn(
                                    'group relative overflow-hidden rounded-3xl border border-border/50 bg-card p-8 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1',
                                    'dark:bg-card/5 dark:border-border',
                                )}
                            >
                                <div className="mb-6 inline-flex rounded-2xl bg-primary/10 p-3 text-primary group-hover:scale-110 transition-transform">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
