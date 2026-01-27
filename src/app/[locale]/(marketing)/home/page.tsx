import { Button } from '@/features/shared/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Logo } from '@/features/shared/components/common/logo';
import { LocaleSwitcher } from '@/features/shared/components/common/locale-switcher';

import { Hero } from './components/hero';
import { Ticker } from './components/ticker';
import { PartnerMarquee } from './components/partner-marquee';
import { Features } from './components/features';
import { LiveAnalysis } from './components/live-analysis';
import { Markets } from './components/markets';
import { FAQ } from './components/faq';
import { CTA } from './components/cta';

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    const common = await getTranslations('common');
    const marketing = await getTranslations('marketing');

    const stats = marketing.raw('stats.items') as { value: string; label: string }[];
    const tickerItems = marketing.raw('ticker.items') as { symbol: string; label: string; change: string }[];
    const featureItems = marketing.raw('features.items') as { title: string; description: string }[];
    const liveEvents = marketing.raw('live.events') as { title: string; description: string }[];
    const marketRegions = marketing.raw('markets.regions') as { name: string; note: string; exchanges: string[] }[];
    const faqItems = marketing.raw('faq.items') as { question: string; answer: string }[];
    const partnerLogos = marketing.raw('partners.logos') as string[];

    return (
        <main className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-primary-foreground">
            <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <Link href={`/${locale}/home`}>
                        <Logo size="md" variant="auto" />
                    </Link>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <LocaleSwitcher />
                        <Link href={`/${locale}`}>
                            <Button className="hidden sm:flex rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white shadow-[0_4px_20px_rgba(14,165,233,0.3)] hover:shadow-[0_6px_25px_rgba(14,165,233,0.4)] transition-all">
                                {marketing('hero.primaryCta')}
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <Hero 
                badge={marketing('hero.badge')}
                headlineLeading={marketing('hero.headlineLeading')}
                headlineHighlight={marketing('hero.headlineHighlight')}
                subheading={marketing('hero.subheading')}
                primaryCta={marketing('hero.primaryCta')}
                secondaryCta={marketing('hero.secondaryCta')}
                stats={stats}
                locale={locale}
            />

            <Ticker 
                title={marketing('ticker.title')}
                items={tickerItems}
            />

            <PartnerMarquee 
                title={marketing('partners.title')}
                logos={partnerLogos}
            />

            <Features 
                title={marketing('features.title')}
                subtitle={marketing('features.subtitle')}
                items={featureItems}
            />

            <LiveAnalysis 
                title={marketing('live.title')}
                insightTitle={marketing('live.insightTitle')}
                insightBody={marketing('live.insightBody')}
                manualTitle={marketing('live.manualTitle')}
                manualBody={marketing('live.manualBody')}
                eventsTitle={marketing('live.eventsTitle')}
                events={liveEvents}
            />

            <Markets 
                title={marketing('markets.title')}
                subtitle={marketing('markets.subtitle')}
                regions={marketRegions}
            />

            <FAQ 
                title={marketing('faq.title')}
                subtitle={marketing('faq.subtitle')}
                items={faqItems}
            />

            <CTA 
                title={marketing('cta.title')}
                subtitle={marketing('cta.subtitle')}
                primaryText={marketing('cta.primary')}
                secondaryText={marketing('cta.secondary')}
                locale={locale}
            />

            <footer className="border-t border-border/50 bg-muted/20 px-6 py-10 text-muted-foreground">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <Logo size="sm" variant="auto" />
                    <p>© {new Date().getFullYear()} {common('appName')}. All rights reserved.</p>
                </div>
            </footer>
        </main>
    );
}
