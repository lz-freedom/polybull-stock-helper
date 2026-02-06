import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Logo } from '@/features/shared/components/common/logo';
import { LocaleSwitcher } from '@/features/shared/components/common/locale-switcher';

import claudeLogo from '@/assets/ai-model/claude-color.svg';
import deepseekLogo from '@/assets/ai-model/deepseek-color.svg';
import grokLogo from '@/assets/ai-model/grok.svg';
import kimiLogo from '@/assets/ai-model/kimi-color.svg';
import minimaxLogo from '@/assets/ai-model/minimax-color.svg';
import openaiLogo from '@/assets/ai-model/openai.svg';
import qwenLogo from '@/assets/ai-model/qwen-color.svg';

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

const modelLogos = [
    { src: openaiLogo, alt: 'OpenAI' },
    { src: claudeLogo, alt: 'Claude' },
    { src: deepseekLogo, alt: 'DeepSeek' },
    { src: qwenLogo, alt: 'Qwen' },
    { src: kimiLogo, alt: 'Kimi' },
    { src: minimaxLogo, alt: 'MiniMax' },
    { src: grokLogo, alt: 'Grok' },
];

const heroOrbits = [
    { src: openaiLogo, alt: 'OpenAI', style: { top: '6%', right: '10%' } },
    { src: claudeLogo, alt: 'Claude', style: { top: '18%', left: '6%' } },
    { src: deepseekLogo, alt: 'DeepSeek', style: { top: '50%', right: '4%' } },
    { src: qwenLogo, alt: 'Qwen', style: { bottom: '16%', left: '10%' } },
    { src: kimiLogo, alt: 'Kimi', style: { bottom: '6%', right: '22%' } },
    { src: minimaxLogo, alt: 'MiniMax', style: { top: '36%', left: '2%' } },
    { src: grokLogo, alt: 'Grok', style: { top: '8%', left: '46%' } },
];

const ctaOrbits = [
    { src: openaiLogo, alt: 'OpenAI', style: { top: '8%', left: '6%' } },
    { src: claudeLogo, alt: 'Claude', style: { top: '16%', right: '10%' } },
    { src: deepseekLogo, alt: 'DeepSeek', style: { bottom: '10%', left: '16%' } },
    { src: qwenLogo, alt: 'Qwen', style: { bottom: '18%', right: '12%' } },
    { src: kimiLogo, alt: 'Kimi', style: { top: '42%', right: '2%' } },
    { src: minimaxLogo, alt: 'MiniMax', style: { top: '40%', left: '2%' } },
    { src: grokLogo, alt: 'Grok', style: { bottom: '6%', right: '36%' } },
];

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    const common = await getTranslations('common');
    const t = await getTranslations('homePage');

    const navLinks = t.raw('nav.links') as { label: string; href: string }[];
    const stats = t.raw('stats.items') as { value: string; label: string }[];
    const workflowItems = t.raw('consensus.items') as { title: string; description: string }[];
    const replayEvents = t.raw('replay.events') as { title: string; meta: string }[];
    const faqItems = t.raw('faq.items') as { question: string; answer: string }[];
    const footerColumns = t.raw('footer.columns') as { title: string; links: string[] }[];
    const previewMetrics = t.raw('preview.metrics') as { label: string; value: string }[];
    const codeLines = t.raw('sdk.code') as string[];

    return (
        <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
            <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <div className="flex items-center gap-10">
                        <Link href={`/${locale}/home`} className="flex items-center gap-2">
                            <Logo size="lg" variant="auto" />
                        </Link>
                        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
                            {navLinks.map((link) => (
                                <a key={link.label} href={link.href} className="transition-colors hover:text-foreground">
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                        <LocaleSwitcher />
                        <Link href={`/${locale}/sign-in`} className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
                            {t('nav.login')}
                        </Link>
                        <a href="#cta" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
                            {t('nav.contact')}
                        </a>
                        <Link
                            href={`/${locale}`}
                            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
                        >
                            {t('nav.cta')}
                        </Link>
                    </div>
                </div>
            </header>

            <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted pt-20">
                <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                            {t('hero.badge')}
                        </div>
                        <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                            {t('hero.titleLine1')}
                            <br />
                            <span className="text-primary">{t('hero.titleLine2')}</span>
                        </h1>
                        <p className="max-w-xl text-lg text-muted-foreground">{t('hero.subtitle')}</p>
                        <div className="flex flex-wrap items-center gap-4">
                            <Link
                                href={`/${locale}`}
                                className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
                            >
                                {t('hero.primaryCta')}
                            </Link>
                            <a
                                href="#product"
                                className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:border-border"
                            >
                                {t('hero.secondaryCta')}
                            </a>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('hero.note')}</p>
                        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-primary">
                            {t('hero.modelPill')}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="relative rounded-3xl border border-border/70 bg-card/90 p-6 shadow-2xl shadow-primary/20">
                            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                <span>{t('preview.title')}</span>
                                <span className="rounded-full bg-secondary/20 px-2 py-1 text-[10px] text-foreground">
                                    {t('preview.badge')}
                                </span>
                            </div>
                            <div className="mt-4 grid gap-4">
                                <div className="grid gap-3 md:grid-cols-3">
                                    {previewMetrics.map((metric) => (
                                        <div key={metric.label} className="rounded-2xl border border-border bg-muted p-4">
                                            <p className="text-xs text-muted-foreground">{metric.label}</p>
                                            <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{t('preview.chartOneLabel')}</span>
                                            <span className="text-foreground">{t('preview.chartOneValue')}</span>
                                        </div>
                                        <div className="mt-4 h-28 rounded-xl bg-gradient-to-br from-accent via-muted to-background" />
                                    </div>
                                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{t('preview.chartTwoLabel')}</span>
                                            <span className="text-foreground">{t('preview.chartTwoValue')}</span>
                                        </div>
                                        <div className="mt-4 h-28 rounded-xl bg-gradient-to-br from-secondary/20 via-muted to-background" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {heroOrbits.map((orbit) => (
                            <div
                                key={orbit.alt}
                                className="absolute hidden h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-card/90 shadow-lg shadow-primary/20 lg:flex"
                                style={orbit.style}
                            >
                                <Image src={orbit.src} alt={orbit.alt} width={28} height={28} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mx-auto max-w-7xl px-6 pb-10" id="product">
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                            {t('hero.modelLabel')}
                        </span>
                        <div className="ml-auto flex flex-wrap items-center gap-3">
                            {modelLogos.map((logo) => (
                                <div
                                    key={logo.alt}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card"
                                >
                                    <Image src={logo.src} alt={logo.alt} width={22} height={22} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-16" id="models">
                <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
                    <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{t('models.kicker')}</p>
                        <h2 className="text-3xl font-semibold text-foreground">{t('models.title')}</h2>
                        <p className="text-base text-muted-foreground">{t('models.subtitle')}</p>
                        <div className="flex flex-wrap items-center gap-3">
                            {modelLogos.map((logo) => (
                                <div
                                    key={logo.alt}
                                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
                                >
                                    <Image src={logo.src} alt={logo.alt} width={26} height={26} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/20">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                            <span>{t('sdk.codeTitle')}</span>
                            <span className="rounded-full bg-accent px-2 py-1 text-[10px] text-primary">
                                {t('sdk.codeBadge')}
                            </span>
                        </div>
                        <div className="mt-4 rounded-2xl bg-content p-4 text-xs text-muted-foreground">
                            <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                                {t('sdk.codeLabel')}
                            </div>
                            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-5">
                                {codeLines.join('\n')}
                            </pre>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link
                                href={`/${locale}/docs`}
                                className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90"
                            >
                                {t('sdk.primaryCta')}
                            </Link>
                            <a
                                href="#consensus"
                                className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground"
                            >
                                {t('sdk.secondaryCta')}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-16" id="consensus">
                <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
                    <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{t('consensus.kicker')}</p>
                        <h2 className="text-3xl font-semibold text-foreground">{t('consensus.title')}</h2>
                        <p className="text-base text-muted-foreground">{t('consensus.subtitle')}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {workflowItems.map((item) => (
                            <div key={item.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-16" id="replay">
                <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr]">
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('replay.kicker')}</p>
                                <h3 className="mt-2 text-2xl font-semibold text-foreground">{t('replay.title')}</h3>
                                <p className="mt-2 text-sm text-muted-foreground">{t('replay.subtitle')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="h-9 w-9 rounded-full border border-border text-muted-foreground">⏮</button>
                                <button className="h-9 w-9 rounded-full bg-primary text-primary-foreground">▶</button>
                                <button className="h-9 w-9 rounded-full border border-border text-muted-foreground">⏭</button>
                            </div>
                        </div>
                        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-secondary" />
                        </div>
                        <div className="mt-5 space-y-3">
                            {replayEvents.map((event) => (
                                <div key={event.title} className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3 text-sm">
                                    <span className="text-foreground">{event.title}</span>
                                    <span className="text-xs text-muted-foreground">{event.meta}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{t('replay.highlight')}</p>
                        <h3 className="text-3xl font-semibold text-foreground">{t('replay.heading')}</h3>
                        <p className="text-base text-muted-foreground">{t('replay.description')}</p>
                        <div className="grid gap-3">
                            {stats.map((item) => (
                                <div key={item.label} className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
                                    <p className="text-xs text-muted-foreground">{item.label}</p>
                                    <p className="mt-1 text-2xl font-semibold text-foreground">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-gradient-to-b from-background to-background">
                <div className="mx-auto max-w-7xl px-6 py-16">
                    <div className="rounded-3xl border border-border bg-card p-8 shadow-xl">
                        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                            <div className="space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{t('faq.kicker')}</p>
                                <h3 className="text-3xl font-semibold text-foreground">{t('faq.title')}</h3>
                                <p className="text-base text-muted-foreground">{t('faq.subtitle')}</p>
                            </div>
                            <div className="space-y-4">
                                {faqItems.map((item) => (
                                    <div key={item.question} className="rounded-2xl border border-border bg-muted p-4">
                                        <p className="text-sm font-semibold text-foreground">{item.question}</p>
                                        <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative overflow-hidden bg-card" id="cta">
                <div className="mx-auto max-w-7xl px-6 py-20">
                    <div className="relative rounded-3xl border border-border bg-gradient-to-br from-background via-background to-muted px-8 py-12 text-center shadow-2xl shadow-primary/20">
                        <p className="text-xs uppercase tracking-[0.3em] text-primary">{t('cta.kicker')}</p>
                        <h3 className="mt-4 text-3xl font-semibold text-foreground">{t('cta.title')}</h3>
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">{t('cta.subtitle')}</p>
                        <div className="mt-6 flex justify-center">
                            <Link
                                href={`/${locale}`}
                                className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                            >
                                {t('cta.button')}
                            </Link>
                        </div>

                        {ctaOrbits.map((orbit) => (
                            <div
                                key={orbit.alt}
                                className="absolute hidden h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-card/90 shadow-lg shadow-primary/20 md:flex"
                                style={orbit.style}
                            >
                                <Image src={orbit.src} alt={orbit.alt} width={26} height={26} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="border-t border-border/60 bg-card px-6 py-12 text-muted-foreground">
                <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
                    {footerColumns.map((column) => (
                        <div key={column.title} className="space-y-3 text-sm">
                            <p className="font-semibold text-foreground">{column.title}</p>
                            <div className="space-y-2">
                                {column.links.map((link) => (
                                    <p key={link}>{link}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-4 text-xs sm:flex-row">
                    <Logo size="sm" variant="auto" />
                    <p>© {new Date().getFullYear()} {common('appName')}. {t('footer.rights')}</p>
                </div>
            </footer>
        </main>
    );
}
