import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface HeroProps {
    badge: string;
    headlineLeading: string;
    headlineHighlight: string;
    subheading: string;
    primaryCta: string;
    secondaryCta: string;
    stats: { value: string; label: string }[];
    locale: string;
}

export function Hero({
    badge,
    headlineLeading,
    headlineHighlight,
    subheading,
    primaryCta,
    secondaryCta,
    stats,
    locale,
}: HeroProps) {
    return (
        <section className="relative px-6 pt-32 pb-20 lg:pt-48 lg:pb-32">
            <div className="pointer-events-none absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[100px] mix-blend-screen" />
            <div className="pointer-events-none absolute left-[-100px] top-40 h-[400px] w-[400px] rounded-full bg-secondary/20 blur-[100px] mix-blend-screen" />

            <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary shadow-lg shadow-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>{badge}</span>
                    </div>

                    <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.1]">
                        {headlineLeading}{' '}
                        <span className="text-transparent bg-gradient-to-r from-primary via-accent-foreground to-secondary bg-clip-text">
                            {headlineHighlight}
                        </span>
                    </h1>

                    <p className="text-lg leading-relaxed text-muted-foreground lg:text-xl max-w-2xl">
                        {subheading}
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <Link href={`/${locale}`}>
                            <Button size="lg" className="h-14 rounded-full bg-primary text-base font-bold text-primary-foreground shadow-xl shadow-primary/40 hover:bg-primary/90 hover:shadow-2xl transition-all">
                                {primaryCta}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href={`/${locale}/pricing`}>
                            <Button size="lg" variant="outline" className="h-14 rounded-full border-border/40 bg-card/5 text-base text-foreground hover:bg-card/10 backdrop-blur-sm">
                                {secondaryCta}
                            </Button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-8 sm:grid-cols-4 lg:gap-12">
                        {stats.map((item) => (
                            <div key={item.label} className="group relative">
                                <div className="absolute -inset-2 rounded-xl bg-card/5 opacity-0 transition-opacity group-hover:opacity-100" />
                                <p className="relative text-3xl font-bold text-foreground lg:text-4xl">{item.value}</p>
                                <p className="relative mt-1 text-xs uppercase tracking-widest text-muted-foreground">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative pt-10 lg:pt-0">
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary via-secondary to-accent-foreground opacity-30 blur-2xl" />
                    <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-background/80 p-1 shadow-2xl backdrop-blur-xl">
                        <div className="rounded-2xl border border-border/30 bg-content p-6 h-full min-h-[400px]">
                            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-destructive/10" />
                                    <div className="h-3 w-3 rounded-full bg-secondary" />
                                    <div className="h-3 w-3 rounded-full bg-success" />
                                </div>
                                <div className="h-2 w-20 rounded-full bg-card/10" />
                            </div>
                            <div className="space-y-4">
                                <div className="h-32 rounded-xl bg-gradient-to-br from-background/5 to-transparent border border-border/30 p-4 relative overflow-hidden">
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-success/20 to-transparent" />
                                    <div className="flex items-end gap-2 h-full pb-2 px-2">
                                        {[40, 60, 45, 70, 65, 80, 75, 90].map((h, i) => (
                                            <div key={i} style={{ height: `${h}%` }} className="flex-1 rounded-t-sm bg-success/50" />
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-24 rounded-xl bg-card/5 border border-border/30 p-4">
                                        <div className="h-2 w-12 rounded bg-card/20 mb-2" />
                                        <div className="h-6 w-20 rounded bg-card/10" />
                                    </div>
                                    <div className="h-24 rounded-xl bg-card/5 border border-border/30 p-4">
                                        <div className="h-2 w-12 rounded bg-card/20 mb-2" />
                                        <div className="h-6 w-20 rounded bg-card/10" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
      
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground/50">
                <ArrowDown className="h-6 w-6" />
            </div>
        </section>
    );
}
