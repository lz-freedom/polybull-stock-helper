'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut, useSession } from 'next-auth/react';
import {
    MessageSquarePlus,
    BookOpen,
    Activity,
    PanelLeftClose,
    PanelLeft,
    Sun,
    Moon,
    Monitor,
    Languages,
    ChevronRight,
    Gift,
    Gem,
    LogIn,
    LogOut,
    MoreHorizontal,
    Settings,
    UserPlus,
} from 'lucide-react';
import { cn } from '@features/shared/lib/utils';
import cardBgLight from '@/assets/free-trial/card-bg-light.jpg';
import cardBgDark from '@/assets/free-trial/card-bg.jpg';
import Image from 'next/image';
import { Logo } from '@features/shared/components/common/logo';
import { Button } from '@features/shared/components/ui/button';
import { AuthModal } from '@features/shared/components/common/auth-modal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@features/shared/components/ui/dropdown-menu';

interface AppSidebarProps {
    locale: string;
}

const themeValues = ['light', 'dark', 'system'] as const;
type ThemeValue = typeof themeValues[number];

const localeOptions = [
    { value: 'en', label: 'EN' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
];

export function AppSidebar({ locale }: AppSidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [theme, setTheme] = useState<ThemeValue>('system');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<'theme' | 'language' | null>(null);
    const { data: session } = useSession();
    const user = session?.user;
    const userInitial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U';
    const userLabel = user?.name ?? user?.email ?? 'User';
    const userDisplayName = user?.name ?? user?.email?.split('@')[0] ?? 'User';
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations('sidebar');

    const menuItems = [
        { icon: MessageSquarePlus, labelKey: 'newChat', href: '/chat' },
        { icon: BookOpen, labelKey: 'financeWiki', href: '/wiki' },
        { icon: Activity, labelKey: 'marketPulse', href: '/pulse', isNew: true },
    ];

    const themeOptions = [
        { value: 'light' as ThemeValue, labelKey: 'light', icon: Sun },
        { value: 'dark' as ThemeValue, labelKey: 'dark', icon: Moon },
        { value: 'system' as ThemeValue, labelKey: 'system', icon: Monitor },
    ];

    // Apply theme
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, [theme]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdown(null);
        if (openDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openDropdown]);

    const handleLocaleChange = (newLocale: string) => {
    // 处理 localePrefix: 'as-needed' 的情况
    // 英文路径可能没有 /en 前缀 (如 / 而不是 /en)
        let newPath: string;
    
        // 检查路径是否以当前 locale 开头
        if (pathname.startsWith(`/${locale}/`)) {
            newPath = pathname.replace(`/${locale}/`, `/${newLocale}/`);
        } else if (pathname === `/${locale}`) {
            newPath = `/${newLocale}`;
        } else {
            // 路径没有 locale 前缀 (英文默认情况)
            newPath = `/${newLocale}${pathname}`;
        }
    
        router.push(newPath);
        setOpenDropdown(null);
    };

    const getCurrentThemeIcon = () => {
        const opt = themeOptions.find(o => o.value === theme);
        return opt?.icon || Monitor;
    };

    const getCurrentLocaleLabel = () => {
        return localeOptions.find(l => l.value === locale)?.label || 'EN';
    };

    const ThemeIcon = getCurrentThemeIcon();

    return (
        <>
            <aside
                className={cn(
                    'flex flex-col h-screen bg-[#F6F7F9] dark:bg-[#ffffff0a] border-r border-[#E6EAF0] dark:border-[#2A2F36] transition-all duration-300',
                    collapsed ? 'w-16' : 'w-[282px]',
                )}
            >
                {/* Logo & Toggle */}
                <div className="flex h-[60px] items-center px-4">
                    {!collapsed && (
                        <Link href={`/${locale}`}>
                            <Logo size="sm" variant="light" />
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(!collapsed)}
                        className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                        {collapsed ? <PanelLeft className="size-5" /> : <PanelLeftClose className="size-5" />}
                    </Button>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname.includes(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={`/${locale}${item.href}`}
                                className={cn(
                                    'flex items-center gap-2 rounded-md p-2 text-sm transition-all duration-200 h-8',
                                    isActive
                                        ? 'bg-white text-slate-900 shadow-sm dark:bg-white/5 dark:text-slate-100'
                                        : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
                                    collapsed && 'justify-center px-2',
                                )}
                                title={collapsed ? t(item.labelKey) : undefined}
                            >
                                <item.icon className={cn('h-5 w-5 flex-shrink-0', item.isNew && 'text-rose-500')} />
                                {!collapsed && (
                                    <span
                                        className={cn(
                                            'flex-1 font-semibold',
                                            item.isNew && 'text-rose-500',
                                        )}
                                    >
                                        {t(item.labelKey)}
                                    </span>
                                )}
                                {!collapsed && item.isNew && (
                                    <span className="px-1.5 py-0.5 text-xs bg-gradient-to-r from-rose-500 to-violet-500 text-white rounded-full font-semibold leading-none">
                                        {t('newFeature')}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                    <div className="px-2 py-2 space-y-2 border-t border-[#E6EAF0] dark:border-[#2A2F36]">
                    {/* Settings Row - Theme & Language */}
                    {!collapsed && (
                        <div className="space-y-2">
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdown(openDropdown === 'theme' ? null : 'theme');
                                    }}
                                    className="w-full flex items-center justify-between gap-2 px-2 py-1 text-sm text-slate-700 hover:text-slate-900 hover:bg-white/70 rounded-md transition-colors h-10 dark:text-slate-200 dark:hover:bg-white/5"
                                >
                                    <div className="flex items-center gap-2">
                                        <ThemeIcon className="h-4 w-4" />
                                        <span>{t('appearance')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <span>{t(themeOptions.find((opt) => opt.value === theme)?.labelKey ?? 'system')}</span>
                                        <ChevronRight className={cn('h-4 w-4 transition-transform', openDropdown === 'theme' && 'rotate-90')} />
                                    </div>
                                </button>
                
                                {/* Theme Dropdown Menu */}
                                {openDropdown === 'theme' && (
                                    <div className="absolute left-0 right-0 bottom-full mb-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50">
                                        {themeOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTheme(opt.value);
                                                    setOpenDropdown(null);
                                                }}
                                                className={cn(
                                                    'w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors',
                                                    theme === opt.value 
                                                        ? 'bg-primary/10 text-primary' 
                                                        : 'text-foreground hover:bg-accent',
                                                )}
                                            >
                                                <opt.icon className="h-4 w-4" />
                                                <span>{t(opt.labelKey)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdown(openDropdown === 'language' ? null : 'language');
                                    }}
                                    className="w-full flex items-center justify-between gap-2 px-2 py-1 text-sm text-slate-700 hover:text-slate-900 hover:bg-white/70 rounded-md transition-colors h-10 dark:text-slate-200 dark:hover:bg-white/5"
                                >
                                    <div className="flex items-center gap-2">
                                        <Languages className="h-4 w-4" />
                                        <span>{t('language')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <span>{getCurrentLocaleLabel()}</span>
                                        <ChevronRight className={cn('h-4 w-4 transition-transform', openDropdown === 'language' && 'rotate-90')} />
                                    </div>
                                </button>
                
                                {/* Language Dropdown Menu */}
                                {openDropdown === 'language' && (
                                    <div className="absolute right-0 bottom-full mb-1 w-32 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50">
                                        {localeOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleLocaleChange(opt.value);
                                                }}
                                                className={cn(
                                                    'w-full text-left px-3 py-2.5 text-sm transition-colors',
                                                    locale === opt.value 
                                                        ? 'bg-primary/10 text-primary' 
                                                        : 'text-foreground hover:bg-accent',
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Collapsed: Icon buttons */}
                    {collapsed && (
                        <div className="flex flex-col items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    const idx = themeValues.indexOf(theme);
                                    setTheme(themeValues[(idx + 1) % 3]);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title={t('appearance')}
                            >
                                <ThemeIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    const locales = ['en', 'zh', 'ja'];
                                    const idx = locales.indexOf(locale);
                                    handleLocaleChange(locales[(idx + 1) % 3]);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title={t('language')}
                            >
                                <Languages className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Learn More */}
                    {!collapsed && !user && (
                        <Link
                            href={`/${locale}/home`}
                            className="relative flex h-12 items-center justify-start gap-3 rounded-[8px] px-4 py-3 text-sm text-slate-800 transition-all duration-200 ease-linear dark:text-slate-100"
                        >
                            <div
                                className="absolute left-0 top-0 z-0 h-full w-full rounded-[8px] bg-cover bg-center dark:hidden"
                                style={{ backgroundImage: `url(${cardBgLight.src})` }}
                            />
                            <div
                                className="absolute left-0 top-0 z-0 hidden h-full w-full rounded-[8px] bg-cover bg-center dark:block"
                                style={{ backgroundImage: `url(${cardBgDark.src})` }}
                            />
                            <div className="absolute left-0 top-0 z-0 h-full w-full rounded-[8px] border-2 border-[#E6EAF0] dark:border-white/10" />
                            <Image
                                src="/logo.svg"
                                alt="Surf"
                                width={20}
                                height={20}
                                className="z-10"
                            />
                            <span className="z-10 font-semibold transition-opacity duration-200 ease-linear">
                                {t('learnMore')}
                            </span>
                        </Link>
                    )}

                    {!collapsed && user && (
                        <button
                            type="button"
                            className="w-full flex items-center gap-2 px-2 py-1 text-sm text-slate-700 hover:text-slate-900 hover:bg-white/70 rounded-md transition-colors h-10 dark:text-slate-200 dark:hover:bg-white/5"
                        >
                            <UserPlus className="h-4 w-4" />
                            <span>{t('shareWithFriends')}</span>
                        </button>
                    )}

                    {/* Auth Button */}
                    {user ? (
                        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center px-2' : '')}>
                            <div className="h-12 w-12 rounded-full bg-emerald-700 text-white flex items-center justify-center font-semibold text-base">
                                {userInitial}
                            </div>
                            {!collapsed && (
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-slate-900 truncate">{userDisplayName}</div>
                                    <div className="text-xs text-slate-500 truncate">{userLabel}</div>
                                </div>
                            )}
                            {!collapsed && (
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                className="rounded-full border-rose-300 text-rose-500 hover:bg-rose-50 px-3 h-7"
                            >
                                    <Link href={`/${locale}/pricing`} className="flex items-center gap-1">
                                        <Gem className="h-3.5 w-3.5" />
                                        {t('upgrade')}
                                    </Link>
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            'h-8 w-8 text-muted-foreground hover:text-foreground',
                                            collapsed ? '' : 'ml-auto',
                                        )}
                                        aria-label={t('accountMenu')}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                                    <DropdownMenuItem asChild className="rounded-lg">
                                        <Link href={`/${locale}/pricing`} className="flex items-center">
                                            <Gem className="mr-2 h-4 w-4" />
                                            <span>{t('upgrade')}</span>
                                            <span className="ml-auto text-xs rounded-full bg-emerald-500/15 text-emerald-600 px-2 py-0.5">
                                                -40%
                                            </span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-lg">
                                        <Link href={`/${locale}/pricing`} className="flex items-center">
                                            <Gift className="mr-2 h-4 w-4" />
                                            <span>{t('redeemCode')}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-lg">
                                        <Link href={`/${locale}/dashboard/general`} className="flex items-center">
                                            <Settings className="mr-2 h-4 w-4" />
                                            <span>{t('settings')}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="flex items-center rounded-lg text-red-600 focus:text-red-600"
                                        onClick={() => signOut({ callbackUrl: `/${locale}` })}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>{t('signOut')}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <Button
                            onClick={() => setShowAuthModal(true)}
                            variant="outline"
                            className={cn(
                                'bg-transparent border-[#ff2882] text-[#ff2882] hover:text-[#ff2882] hover:bg-[#ff2882]/10 rounded-[8px] transition-all duration-300 ease-in-out px-3 py-3 text-base font-semibold leading-6 shadow-none dark:border-[#ff2882] dark:text-[#ff2882]',
                                collapsed ? 'w-full h-12 p-0' : 'w-full h-12',
                            )}
                        >
                            {collapsed ? <LogIn className="h-4 w-4" /> : t('signInOrUp')}
                        </Button>
                    )}
                </div>
            </aside>

            {/* Auth Modal */}
            {!user && (
                <AuthModal 
                    isOpen={showAuthModal} 
                    onClose={() => setShowAuthModal(false)} 
                    locale={locale}
                />
            )}
        </>
    );
}
