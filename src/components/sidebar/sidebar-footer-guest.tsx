'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { LogIn, Moon, Sun, Monitor, Languages, ChevronRight, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import cardBgLight from '@/assets/free-trial/card-bg-light.jpg';
import cardBgDark from '@/assets/free-trial/card-bg.jpg';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarFooterGuestProps {
    locale: string;
    collapsed: boolean;
    onLoginClick: () => void;
    currentTheme: string | undefined;
    onThemeChange: (theme: string) => void;
    onLocaleChange: (locale: string) => void;
}

export function SidebarFooterGuest({
    locale,
    collapsed,
    onLoginClick,
    currentTheme,
    onThemeChange,
    onLocaleChange
}: SidebarFooterGuestProps) {
    const t = useTranslations('sidebar');

    const getThemeLabel = (val: string) => {
        if (val === 'system') return t('system');
        if (val === 'light') return t('light');
        if (val === 'dark') return t('dark');
        return val;
    };

    if (collapsed) {
        return (
            <div className="p-2 flex flex-col items-center gap-4 pb-4">
                <Button
                    onClick={onLoginClick}
                    size="icon"
                    className="h-9 w-9 border border-pink-500 text-pink-500 hover:bg-pink-50 rounded-lg"
                    variant="outline"
                >
                    <LogIn className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 px-3 pb-4 w-full">
            {/* Appearance & Language Menus */}
            <div className="space-y-1 mt-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between h-10 px-3 text-muted-foreground hover:text-foreground font-normal hover:bg-accent/50 rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0">
                            <div className="flex items-center gap-2">
                                <Palette className="h-4 w-4" />
                                <span className={cn("text-sm font-medium")}>
                                    {t('appearance') || 'Appearance'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground/60">
                                {getThemeLabel(currentTheme)}
                                <ChevronRight className="h-3 w-3" />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" sideOffset={10} align="end" className="w-40 rounded-sm">
                        <DropdownMenuItem onClick={() => onThemeChange('light')}>
                            <Sun className="mr-2 h-4 w-4" /> {t('light')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onThemeChange('dark')}>
                            <Moon className="mr-2 h-4 w-4" /> {t('dark')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onThemeChange('system')}>
                            <Monitor className="mr-2 h-4 w-4" /> {t('system')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between h-10 px-3 text-muted-foreground hover:text-foreground font-normal hover:bg-accent/50 rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0">
                            <div className="flex items-center gap-2">
                                <Languages className="h-4 w-4" />
                                <span className={cn("text-sm font-medium")}>{t('language') || 'Language'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground/60">
                                {locale === 'en' ? 'English' : (locale === 'zh' ? '中文' : '日本語')}
                                <ChevronRight className="h-3 w-3" />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" sideOffset={10} align="end" className="w-40 rounded-sm">
                        <DropdownMenuItem onClick={() => onLocaleChange('en')}>English</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onLocaleChange('zh')}>中文</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onLocaleChange('ja')}>日本語</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Learn About Surf Card - Compact - Taller & Inner Detail */}
            <div
                className="relative overflow-hidden rounded-sm border border-border/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] cursor-pointer group h-11 flex items-center px-3 gap-3 transition-all bg-cover bg-center hover:border-pink-200/50"
                onClick={() => window.open('/home', '_self')}
                style={{
                    backgroundImage: `url(${currentTheme === 'dark' ? cardBgDark.src : cardBgLight.src})`
                }}
            >
                {/* Overlay to ensure text readability */}
                <div className="absolute inset-0 bg-background/5 group-hover:bg-background/0 transition-colors" />

                {/* Icon */}
                <div className="grid place-items-center opacity-90 group-hover:opacity-100 text-foreground relative z-10">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                </div>
                <span className="text-sm font-semibold flex-1 text-foreground/90 group-hover:text-foreground relative z-10">
                    {t('learnMore')}
                </span>
            </div>

            {/* Login Button - Outlined & Pink & Hollow - MATCHING RADIUS & Inner Trace */}
            <Button
                onClick={onLoginClick}
                variant="outline"
                className={cn(
                    "w-full rounded-sm h-11 border border-[#FF4F82] text-[#FF4F82] font-semibold bg-transparent hover:bg-[#FF4F82]/5 transition-all text-sm focus-visible:ring-0 focus-visible:ring-offset-0 shadow-[inset_0_0_0_1px_rgba(255,79,130,0.1)]",
                    "dark:border-[#FF4F82] dark:text-[#FF6B95] dark:hover:bg-[#FF4F82]/10 dark:shadow-[inset_0_0_0_1px_rgba(255,107,149,0.1)]"
                )}
            >
                {t('signInOrUp') || 'Log in or sign up'}
            </Button>
        </div>
    );
}
