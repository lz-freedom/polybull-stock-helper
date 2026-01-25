'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Send, TrendingUp, BarChart3, LineChart, Newspaper } from 'lucide-react';
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
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <AppSidebar locale={locale} />

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Chat Area */}
                <div className="flex-1 flex items-center justify-center p-6 md:p-8">
                    <div className="max-w-2xl w-full space-y-8">
                        {/* Welcome */}
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 shadow-lg shadow-pink-500/25">
                                <Sparkles className="h-7 w-7 text-white" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                                {t('welcomeTitle')}
                            </h1>
                            <p className="text-muted-foreground">
                                {t('welcomeSubtitle')}
                            </p>
                        </div>

                        {/* Input */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition duration-300" />
                            <div className="relative">
                                <textarea
                                    placeholder={t('inputPlaceholder')}
                                    rows={1}
                                    className="w-full bg-card border border-border rounded-2xl px-5 py-4 pr-14 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 shadow-sm resize-none min-h-[56px] max-h-[200px]"
                                />
                                <Button
                                    size="icon"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-md"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Quick Prompts */}
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground text-center">{t('tryThese')}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {quickPrompts.map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        className="flex items-center gap-3 p-3.5 bg-card hover:bg-accent border border-border hover:border-primary/20 rounded-xl text-left transition-all duration-200 group"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500/10 to-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:from-pink-500/20 group-hover:to-orange-500/20 transition-colors">
                                            <prompt.icon className="h-4 w-4 text-pink-500" />
                                        </div>
                                        <span className="text-sm text-foreground/80 group-hover:text-foreground line-clamp-2">
                                            {t(prompt.textKey)}
                                        </span>
                                    </button>
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
