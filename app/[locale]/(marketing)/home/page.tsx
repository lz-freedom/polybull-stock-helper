import { Button } from '@features/shared/components/ui/button';
import { ArrowRight, TrendingUp, Brain, Zap, Shield, ChevronRight, BarChart3, LineChart, Globe } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Logo } from '@features/shared/components/common/logo';
import { LocaleSwitcher } from '@features/shared/components/common/locale-switcher';

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations('common');

    return (
        <main className="min-h-screen bg-background">
            {/* Header */}
            <header className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href={`/${locale}/home`}>
                            <Logo size="md" variant="light" />
                        </Link>
                        <div className="flex items-center gap-4">
                            <LocaleSwitcher />
                            <Link href={`/${locale}`}>
                                <Button className="rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white">
                                    Launch App
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="min-h-screen flex items-center pt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left - Text */}
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                                <Zap className="h-4 w-4 text-primary" />
                                <span className="text-sm text-primary">AI-Powered Stock Analysis</span>
                            </div>
              
                            <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                                Your AI Assistant for
                                <span className="block bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 bg-clip-text text-transparent">
                                    Smarter Investing
                                </span>
                            </h1>
              
                            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                                Get real-time market insights, AI-driven analysis, and personalized investment recommendations. Make informed decisions with confidence.
                            </p>
              
                            <div className="flex flex-wrap gap-4">
                                <Link href={`/${locale}`}>
                                    <Button size="lg" className="text-lg rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-8 h-14">
                                        Start Free Trial
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                                <Link href={`/${locale}/pricing`}>
                                    <Button size="lg" variant="outline" className="text-lg rounded-full border-border text-foreground hover:bg-accent px-8 h-14">
                                        View Pricing
                                    </Button>
                                </Link>
                            </div>

                            {/* Stats */}
                            <div className="flex gap-8 pt-4">
                                <div>
                                    <div className="text-3xl font-bold text-foreground">10K+</div>
                                    <div className="text-sm text-muted-foreground">Active Users</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-foreground">50M+</div>
                                    <div className="text-sm text-muted-foreground">Data Points</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-foreground">99.9%</div>
                                    <div className="text-sm text-muted-foreground">Uptime</div>
                                </div>
                            </div>
                        </div>

                        {/* Right - Demo */}
                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/20 via-rose-500/20 to-orange-500/20 rounded-3xl blur-3xl" />
              
                            <div className="relative bg-card backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                                    <div className="h-3 w-3 rounded-full bg-red-500" />
                                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                                    <div className="h-3 w-3 rounded-full bg-green-500" />
                                    <span className="ml-4 text-sm text-muted-foreground">iVibeFinance AI</span>
                                </div>
                
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-end">
                                        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-2xl rounded-tr-md max-w-xs">
                                            Analyze AAPL stock for me
                                        </div>
                                    </div>
                  
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                                            <Brain className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="bg-muted text-foreground px-4 py-3 rounded-2xl rounded-tl-md max-w-sm">
                                            <p className="font-medium mb-2">AAPL Analysis Summary</p>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-chart-1" />
                                                    <span>Price: $178.52 (+2.3%)</span>
                                                </div>
                                                <p className="text-muted-foreground">Strong buy signal based on technical indicators.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                            Why Choose iVibeFinance?
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Powerful AI tools designed for modern investors
                        </p>
                    </div>
          
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Brain, title: 'AI Analysis', description: 'Advanced ML models analyze market trends and patterns.' },
                            { icon: BarChart3, title: 'Smart Insights', description: 'Actionable insights backed by real-time data.' },
                            { icon: Zap, title: 'Real-time Data', description: 'Live market data and instant price alerts.' },
                            { icon: Shield, title: 'Secure & Private', description: 'Your data is encrypted and never shared.' },
                        ].map((feature, index) => (
                            <div key={index} className="bg-card backdrop-blur border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors group">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/10 to-orange-500/10 flex items-center justify-center mb-4 group-hover:from-pink-500/20 group-hover:to-orange-500/20 transition-colors">
                                    <feature.icon className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                                <p className="text-muted-foreground text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Markets Section */}
            <section className="py-24 border-t border-border bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                            Global Market Coverage
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Access comprehensive data from major stock exchanges worldwide
                        </p>
                    </div>
          
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: Globe, title: 'US Markets', markets: ['NYSE', 'NASDAQ', 'AMEX'], flag: '🇺🇸' },
                            { icon: LineChart, title: 'China Markets', markets: ['Shanghai', 'Shenzhen', 'Hong Kong'], flag: '🇨🇳' },
                            { icon: TrendingUp, title: 'Japan Markets', markets: ['Tokyo', 'Osaka'], flag: '🇯🇵' },
                        ].map((market, index) => (
                            <div key={index} className="bg-card border border-border rounded-2xl p-6 text-center">
                                <div className="text-4xl mb-4">{market.flag}</div>
                                <h3 className="text-xl font-semibold text-foreground mb-3">{market.title}</h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {market.markets.map((m, i) => (
                                        <span key={i} className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">
                                            {m}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 border-t border-border">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                        Ready to Transform Your Investing?
                    </h2>
                    <p className="text-lg text-muted-foreground mb-8">
                        Join thousands of investors making smarter decisions with AI
                    </p>
                    <Link href={`/${locale}`}>
                        <Button size="lg" className="text-lg rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-10 h-14">
                            Get Started for Free
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <Logo size="sm" variant="light" />
                        <p className="text-muted-foreground text-sm">
                            © 2024 {t('appName')}. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}
