import { Activity, TrendingUp } from 'lucide-react';

interface LiveAnalysisProps {
    title: string;
    insightTitle: string;
    insightBody: string;
    manualTitle: string;
    manualBody: string;
    eventsTitle: string;
    events: { title: string; description: string }[];
}

export function LiveAnalysis({
    title,
    insightTitle,
    insightBody,
    manualTitle,
    manualBody,
    eventsTitle,
    events,
}: LiveAnalysisProps) {
    return (
        <section className="bg-background px-6 py-24 border-y border-border/50">
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr,0.8fr]">
                <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-secondary/20 to-background p-8 lg:p-10 dark:from-background/10 dark:to-background/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">{title}</p>
                    <div className="mt-8 space-y-8">
                        <div>
                            <p className="text-sm font-bold text-success">{insightTitle}</p>
                            <p className="mt-2 text-lg text-foreground/90">{insightBody}</p>
                        </div>
                        <div className="rounded-3xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm dark:bg-foreground/60">
                            <p className="text-sm font-bold text-info">{manualTitle}</p>
                            <p className="mt-2 text-base text-muted-foreground">{manualBody}</p>
                        </div>
                    </div>
                </div>
        
                <div className="flex flex-col rounded-3xl border border-border/50 bg-card p-8 shadow-sm dark:bg-card/5">
                    <div className="mb-6 flex items-center gap-3">
                        <Activity className="h-5 w-5 text-success animate-pulse" />
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                            {eventsTitle}
                        </p>
                    </div>
                    <div className="flex-1 space-y-5">
                        {events.map((event) => (
                            <div key={event.title} className="flex items-start gap-4 rounded-2xl border border-border/50 bg-secondary/20 p-4 transition-colors hover:bg-secondary/30 dark:bg-card/5 dark:hover:bg-card/10">
                                <div className="rounded-full bg-success/10 p-2 text-success">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{event.title}</p>
                                    <p className="text-sm text-muted-foreground">{event.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
