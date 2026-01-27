import { Button } from '@/features/shared/components/ui/button';
import Link from 'next/link';

interface CTAProps {
  title: string;
  subtitle: string;
  primaryText: string;
  secondaryText: string;
  locale: string;
}

export function CTA({ title, subtitle, primaryText, secondaryText, locale }: CTAProps) {
  return (
    <section className="px-6 pb-32 pt-10">
      <div className="relative mx-auto max-w-5xl">
        <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 opacity-30 blur-2xl" />
        
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0ea5e9] p-12 text-center shadow-2xl lg:p-20">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
            <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-sky-400/30 blur-3xl mix-blend-screen" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl mix-blend-screen" />

            <div className="relative z-10">
                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/70">PolyBull</p>
                <h2 className="mt-6 text-4xl font-bold text-white lg:text-5xl">{title}</h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 lg:text-xl">{subtitle}</p>
                
                <div className="mt-10 flex flex-wrap justify-center gap-6">
                    <Link href={`/${locale}`}>
                    <Button size="lg" className="h-14 rounded-full bg-amber-500 px-8 text-base font-bold text-slate-950 hover:bg-amber-400 shadow-xl transition-transform hover:scale-105">
                        {primaryText}
                    </Button>
                    </Link>
                    <Link href={`/${locale}/pricing`}>
                    <Button size="lg" variant="outline" className="h-14 rounded-full border-white/40 bg-white/10 text-base text-white backdrop-blur-sm hover:bg-white/20 hover:border-white/60">
                        {secondaryText}
                    </Button>
                    </Link>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
}
