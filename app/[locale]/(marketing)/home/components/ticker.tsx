'use client';

import { cn } from '@/lib/utils';

interface TickerProps {
  title: string;
  items: { symbol: string; label: string; change: string }[];
}

export function Ticker({ title, items }: TickerProps) {
  return (
    <section className="border-y border-border bg-background/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center">
        <span 
          className="shrink-0 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
          aria-hidden="true"
        >
          {title}
        </span>
        
        <div 
          className="relative flex-1 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
          }}
          role="region"
          aria-label={title}
          aria-live="polite"
        >
          <div className="flex w-max min-w-full animate-infinite-scroll gap-6 hover:[animation-play-state:paused]">
            {[...items, ...items, ...items].map((item, i) => (
              <div 
                key={`${item.symbol}-${i}`} 
                className={cn(
                  "flex items-center gap-3 rounded-full border border-border bg-secondary/30 px-4 py-1.5 backdrop-blur-md transition-colors hover:bg-secondary/50",
                  "dark:bg-white/5 dark:hover:bg-white/10"
                )}
              >
                <span className="font-semibold text-foreground">{item.symbol}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={cn(
                  "text-xs font-medium",
                  item.change.startsWith('-') ? "text-red-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {item.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
