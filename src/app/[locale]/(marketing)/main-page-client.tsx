'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Send, TrendingUp, BarChart3, LineChart, Newspaper, ChevronDown, CalendarDays, Search, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppSidebar } from '@features/shared/components/common/app-sidebar';
import { AuthModal } from '@features/shared/components/common/auth-modal';
import { Button } from '@features/shared/components/ui/button';

interface MainPageClientProps {
    locale: string;
}

const quickPrompts = [
    { icon: TrendingUp, textKey: 'prompt1' },
    { icon: BarChart3, textKey: 'prompt2' },
    { icon: LineChart, textKey: 'prompt3' },
    { icon: Newspaper, textKey: 'prompt4' },
];

export function MainPageClient({ locale }: MainPageClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const t = useTranslations('home');
    const [showAuthModal, setShowAuthModal] = useState(false);

    // 检测 auth=required 参数，自动弹出登录窗口
    useEffect(() => {
        if (searchParams.get('auth') === 'required') {
            setShowAuthModal(true);
            // 清除 URL 参数，但保留 callbackUrl
            const callbackUrl = searchParams.get('callbackUrl');
            if (callbackUrl) {
                // 存储 callbackUrl 以便登录成功后重定向
                sessionStorage.setItem('authCallbackUrl', callbackUrl);
            }
            // 清除 URL 中的参数
            router.replace(`/${locale}`);
        }
    }, [searchParams, router, locale]);

    return (
        <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0F1114] flex">
            {/* Sidebar */}
            <AppSidebar locale={locale} />

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative bg-[#F7F8FA] dark:bg-[#0F1114]">
                {/* Chat Area */}
                <div
                    className="flex-1 flex items-center justify-center p-6 md:p-8"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, rgba(var(--marketing-dots-bg-rgb), 0) 0%, rgba(var(--marketing-dots-bg-rgb), 0) 55%, rgba(var(--marketing-dots-bg-rgb), 1) 85%), radial-gradient(circle, rgba(var(--marketing-dots-rgb), 0.22) 1px, transparent 1px)',
                        backgroundRepeat: 'no-repeat, repeat',
                        backgroundPosition: 'center, center',
                        backgroundSize: 'auto, 14px 14px',
                    }}
                >
                    <div className="max-w-3xl w-full space-y-8">
                        {/* Welcome */}
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 shadow-lg shadow-pink-500/25">
                                <Sparkles className="h-7 w-7 text-white" />
                            </div>
                            <h1 className="text-2xl md:text-[32px] font-semibold text-foreground">
                                {t('welcomeTitle')}
                            </h1>
                            <p className="text-muted-foreground dark:text-slate-400">
                                {t('welcomeSubtitle')}
                            </p>
                        </div>

                        {/* Input */}
                        <div className="relative">
                            <div className="relative mx-auto max-w-3xl">
                                <div className="mb-4 flex items-center justify-center">
                                    <div className="rounded-full border border-white/10 bg-black/40 px-4 py-1 text-xs font-semibold text-white">
                                        Surf Raised $15M
                                    </div>
                                </div>
                                <form className="relative flex flex-col gap-2 rounded-[14px] border border-black/10 bg-white px-4 py-3.5 backdrop-blur-[8px] dark:border-white/10 dark:bg-[#121417]">
                                    <div className="hidden dark:block absolute -top-px left-0 z-10 h-px w-52 opacity-80"
                                        style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                                    />
                                    <div className="hidden dark:block absolute -bottom-px right-0 z-10 h-px w-52 opacity-80"
                                        style={{ background: 'linear-gradient(90deg, rgba(153,153,153,0) 0%, rgb(255,255,255) 50%, rgba(153,153,153,0) 100%)' }}
                                    />
                                    <textarea
                                        placeholder={t('inputPlaceholder')}
                                        rows={1}
                                        className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none resize-none min-h-[50px]"
                                    />
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            className="-ml-1 inline-flex items-center gap-1 rounded-[6px] px-1 py-0.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                        >
                                            <span>自动</span>
                                            <ChevronDown className="h-4 w-4" />
                                        </button>
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 hover:bg-pink-600 text-white"
                                            >
                                                <Send className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Quick Prompts */}
                        <div className="space-y-4">
                            <p className="text-xs text-muted-foreground text-center">{t('tryThese')}</p>
                            <div className="rounded-[14px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121417] p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/90 dark:text-slate-200">
                                    <BarChart3 className="h-4 w-4" />
                                    <span>Top Asked on iVibe (24h)</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {quickPrompts.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            className="flex items-center gap-3 p-3 bg-white dark:bg-[#14171C] hover:bg-white dark:hover:bg-[#1A1E24] border border-black/10 dark:border-white/10 rounded-[12px] text-left transition-all duration-200 group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/10 to-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:from-pink-500/20 group-hover:to-orange-500/20 transition-colors">
                                                <prompt.icon className="h-4 w-4 text-pink-500" />
                                            </div>
                                            <span className="text-sm text-foreground/80 group-hover:text-foreground line-clamp-2 dark:text-slate-200">
                                                {t(prompt.textKey)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[14px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121417] p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm font-semibold text-foreground/90 dark:text-slate-200">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>事件日历</span>
                                </div>
                                <button className="text-xs text-muted-foreground hover:text-foreground">查看更多</button>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex flex-col gap-2 w-full">
                                    <span className="text-xs font-semibold text-pink-500 bg-pink-500/10 w-fit px-2 py-0.5 rounded-full">即将上线</span>
                                    <div className="text-sm text-foreground/80 dark:text-slate-200">Aztec · Feb 11, 2026</div>
                                    <div className="text-sm text-foreground/80 dark:text-slate-200">Rainbow · Feb 05, 2026</div>
                                </div>
                                <div className="hidden md:block h-auto w-px bg-black/10 dark:bg-white/10" />
                                <div className="flex flex-col gap-2 w-full">
                                    <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">已上线</span>
                                    <div className="text-sm text-foreground/80 dark:text-slate-200">Seeker · Jan 21, 2026</div>
                                    <div className="text-sm text-foreground/80 dark:text-slate-200">Sentient · Jan 22, 2026</div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[14px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121417] p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm font-semibold text-foreground/90 dark:text-slate-200">
                                <div className="flex items-center gap-2">
                                    <Search className="h-4 w-4" />
                                    <span>热门话题</span>
                                </div>
                                <button className="text-xs text-muted-foreground hover:text-foreground">查看更多</button>
                            </div>
                            <div className="space-y-2">
                                {quickPrompts.map((prompt, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-sm text-foreground/80 dark:text-slate-200">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500">热门问题</span>
                                        <span className="truncate flex-1">{t(prompt.textKey)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Disclaimer */}
                        <p className="text-xs text-muted-foreground text-center">
                            {t('disclaimer')}
                        </p>
                    </div>
                </div>
            </main>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                locale={locale}
            />
        </div>
    );
}
