'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
    ChevronDown,
    Info,
    LogIn,
} from 'lucide-react';
import { cn } from '@features/shared/lib/utils';
import { Logo } from '@features/shared/components/common/logo';
import { Button } from '@features/shared/components/ui/button';
import { AuthModal } from '@features/shared/components/common/auth-modal';

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
                    'flex flex-col h-screen bg-card border-r border-border transition-all duration-300',
                    collapsed ? 'w-16' : 'w-64',
                )}
            >
                {/* Logo & Toggle */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    {!collapsed && (
                        <Link href={`/${locale}`}>
                            <Logo size="sm" variant="light" />
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(!collapsed)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname.includes(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={`/${locale}${item.href}`}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                    collapsed && 'justify-center px-2',
                                )}
                                title={collapsed ? t(item.labelKey) : undefined}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                {!collapsed && (
                                    <span className="flex-1 font-medium">{t(item.labelKey)}</span>
                                )}
                                {!collapsed && item.isNew && (
                                    <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full font-medium">
                                        {t('newFeature')}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="p-3 space-y-2 border-t border-border">
                    {/* Settings Row - Theme & Language */}
                    {!collapsed && (
                        <div className="flex items-center gap-2 px-1">
                            {/* Theme Dropdown */}
                            <div className="relative flex-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdown(openDropdown === 'theme' ? null : 'theme');
                                    }}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <ThemeIcon className="h-4 w-4" />
                                        <span>{t('appearance')}</span>
                                    </div>
                                    <ChevronDown className={cn('h-3 w-3 transition-transform', openDropdown === 'theme' && 'rotate-180')} />
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

                            {/* Language Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdown(openDropdown === 'language' ? null : 'language');
                                    }}
                                    className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                >
                                    <Languages className="h-4 w-4" />
                                    <span>{getCurrentLocaleLabel()}</span>
                                    <ChevronDown className={cn('h-3 w-3 transition-transform', openDropdown === 'language' && 'rotate-180')} />
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
                    {!collapsed && (
                        <Link
                            href={`/${locale}/home`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                        >
                            <Info className="h-4 w-4" />
                            <span>{t('learnMore')}</span>
                        </Link>
                    )}

                    {/* Auth Button */}
                    <Button
                        onClick={() => setShowAuthModal(true)}
                        className={cn(
                            'bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all duration-200',
                            collapsed ? 'w-full h-10 p-0' : 'w-full h-10',
                        )}
                    >
                        {collapsed ? <LogIn className="h-4 w-4" /> : t('signInOrUp')}
                    </Button>
                </div>
            </aside>

            {/* Auth Modal */}
            <AuthModal 
                isOpen={showAuthModal} 
                onClose={() => setShowAuthModal(false)} 
                locale={locale}
            />
        </>
    );
}
