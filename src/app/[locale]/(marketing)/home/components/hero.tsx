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
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary shadow-[0_0_15px_rgba(30,64,175,0.2)]">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>{badge}</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.1]">
            {headlineLeading}{' '}
            <span className="text-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text">
              {headlineHighlight}
            </span>
          </h1>

          <p className="text-lg leading-relaxed text-muted-foreground lg:text-xl max-w-2xl">
            {subheading}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href={`/${locale}`}>
              <Button size="lg" className="h-14 rounded-full bg-amber-500 text-base font-bold text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] transition-all">
                {primaryCta}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href={`/${locale}/pricing`}>
              <Button size="lg" variant="outline" className="h-14 rounded-full border-white/20 bg-white/5 text-base text-foreground hover:bg-white/10 backdrop-blur-sm">
                {secondaryCta}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 sm:grid-cols-4 lg:gap-12">
            {stats.map((item) => (
              <div key={item.label} className="group relative">
                <div className="absolute -inset-2 rounded-xl bg-white/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <p className="relative text-3xl font-bold text-foreground lg:text-4xl">{item.value}</p>
                <p className="relative mt-1 text-xs uppercase tracking-widest text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative pt-10 lg:pt-0">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary via-secondary to-amber-500 opacity-30 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-background/80 p-1 shadow-2xl backdrop-blur-xl">
             <div className="rounded-2xl border border-white/5 bg-[#030712] p-6 h-full min-h-[400px]">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    </div>
                    <div className="h-2 w-20 rounded-full bg-white/10" />
                </div>
                <div className="space-y-4">
                    <div className="h-32 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 p-4 relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-emerald-500/20 to-transparent" />
                        <div className="flex items-end gap-2 h-full pb-2 px-2">
                             {[40, 60, 45, 70, 65, 80, 75, 90].map((h, i) => (
                                 <div key={i} style={{ height: `${h}%` }} className="flex-1 rounded-t-sm bg-emerald-500/50" />
                             ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 rounded-xl bg-white/5 border border-white/5 p-4">
                            <div className="h-2 w-12 rounded bg-white/20 mb-2" />
                            <div className="h-6 w-20 rounded bg-white/10" />
                        </div>
                         <div className="h-24 rounded-xl bg-white/5 border border-white/5 p-4">
                            <div className="h-2 w-12 rounded bg-white/20 mb-2" />
                            <div className="h-6 w-20 rounded bg-white/10" />
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
