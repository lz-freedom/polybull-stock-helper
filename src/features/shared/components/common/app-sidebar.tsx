'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
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
    MessageSquare,
} from 'lucide-react';
import { cn } from '@features/shared/lib/utils';
import cardBgLight from '@/assets/free-trial/card-bg-light.jpg';
import cardBgDark from '@/assets/free-trial/card-bg.jpg';
import inviteFriendsBg from '@/assets/invite-friends-bg.png';
import Image from 'next/image';
import { Logo } from '@features/shared/components/common/logo';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@features/shared/components/common/auth-modal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { SidebarFooterGuest } from '@/components/sidebar/sidebar-footer-guest';
import { SidebarFooterAuth } from '@/components/sidebar/sidebar-footer-auth';
import useSWR from 'swr';

interface AppSidebarProps {
    locale: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());


function ChatHistoryList({ locale, pathname }: { locale: string, pathname: string }) {
    const t = useTranslations('sidebar');
    const { data, error } = useSWR('/api/agents/chat?action=get_user_sessions&limit=20', fetcher, {
        refreshInterval: 0,
        revalidateOnFocus: true,
    });

    if (!data?.sessions) return null;

    const sessions = data.sessions as any[];

    return (
        <div className="space-y-1 text-sm">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{t('history') || 'History'}</div>
            {sessions.map(session => (
                <Link
                    key={session.id}
                    href={`/${locale}/chat/${session.id}`}
                    className={cn(
                        'block rounded-md px-2 py-1.5 text-sm transition-colors truncate',
                        pathname.includes(session.id)
                            ? 'bg-muted text-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted dark:hover:bg-muted hover:text-foreground',
                    )}
                >
                    <span className="truncate">{session.title || 'New Chat'}</span>
                </Link>
            ))}
        </div>
    );
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
    const { theme, setTheme } = useTheme();
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
        { icon: BookOpen, labelKey: 'financeWiki', href: '/wiki' },
        { icon: Activity, labelKey: 'marketPulse', href: '/pulse', isNew: true },
    ];

    const themeOptions = [
        { value: 'light', labelKey: 'light', icon: Sun },
        { value: 'dark', labelKey: 'dark', icon: Moon },
        { value: 'system', labelKey: 'system', icon: Monitor },
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdown(null);
        if (openDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openDropdown]);

    const handleLocaleChange = (newLocale: string) => {
        let newPath: string;
        if (pathname.startsWith(`/${locale}/`)) {
            newPath = pathname.replace(`/${locale}/`, `/${newLocale}/`);
        } else if (pathname === `/${locale}`) {
            newPath = `/${newLocale}`;
        } else {
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
        <TooltipProvider delayDuration={0}>
            <>
                <aside
                    className={cn(
                        'flex flex-col h-full bg-sidebar border-r border-border transition-all duration-300',
                        collapsed ? 'w-16' : 'w-[280px]',
                    )}
                >
                    {/* Header: Logo & Toggle */}
                    <div className="flex h-[50px] items-center px-5 shrink-0 mt-2">
                        {!collapsed && (
                            <Link href={`/${locale}`}>
                                <Logo size="sm" variant="light" />
                            </Link>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCollapsed(!collapsed)}
                            className={cn('ml-auto h-8 w-8 text-muted-foreground hover:text-foreground', collapsed && 'mx-auto')}
                        >
                            {collapsed ? <PanelLeft className="size-5" /> : <PanelLeftClose className="size-5" />}
                        </Button>
                    </div>

                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Main Menu & New Chat */}
                        <div className="px-3 py-3 space-y-1">
                            {/* New Chat Button */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={`/${locale}/chat/new`}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                            pathname === `/${locale}/chat/new`
                                                ? 'bg-sidebar-accent text-foreground font-medium'
                                                : 'text-muted-foreground hover:bg-sidebar-accent dark:hover:bg-muted hover:text-foreground',
                                            collapsed && 'justify-center px-0 w-9 mx-auto py-2',
                                        )}
                                    >
                                        <MessageSquarePlus className="h-4 w-4 shrink-0" />
                                        {!collapsed && (
                                            <span className="flex-1 truncate">
                                                {t('newChat')}
                                            </span>
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                {collapsed && (
                                    <TooltipContent side="right">
                                        {t('newChat')}
                                    </TooltipContent>
                                )}
                            </Tooltip>

                            {/* Menu Items */}
                            {menuItems.map((item) => {
                                const isActive = pathname.includes(item.href) && (item.href !== '/' || pathname === `/${locale}`);
                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={`/${locale}${item.href}`}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                                    isActive
                                                        ? 'bg-sidebar-accent text-foreground font-medium'
                                                        : 'text-muted-foreground hover:bg-sidebar-accent dark:hover:bg-muted hover:text-foreground',
                                                    collapsed && 'justify-center px-0 w-9 mx-auto py-2',
                                                )}
                                            >
                                                <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground', item.isNew && 'text-destructive')} />
                                                {!collapsed && (
                                                    <span className={cn('flex-1 truncate', item.isNew && 'text-destructive')}>
                                                        {t(item.labelKey)}
                                                    </span>
                                                )}
                                            </Link>
                                        </TooltipTrigger>
                                        {collapsed && (
                                            <TooltipContent side="right">
                                                {t(item.labelKey)}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                );
                            })}
                        </div>

                        <div className="py-2">
                            <Separator />
                        </div>

                        {/* Chat History ScrollArea */}
                        {!collapsed && user ? (
                            <ScrollArea className="flex-1 px-4">
                                <div className="py-2">
                                    <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider hidden">
                                        {t('history') || 'History'}
                                    </div>
                                    <ChatHistoryList locale={locale} pathname={pathname} />
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="flex-1" />
                        )}
                    </div>

                    {/* Footer: User & Settings */}
                    <div className="shrink-0 border-t border-border mt-auto bg-transparent">
                        {user ? (
                            <SidebarFooterAuth
                                user={user}
                                collapsed={collapsed}
                                locale={locale}
                                currentTheme={theme}
                                onThemeChange={setTheme}
                                onLocaleChange={handleLocaleChange}
                            />
                        ) : (
                            <SidebarFooterGuest
                                locale={locale}
                                collapsed={collapsed}
                                onLoginClick={() => setShowAuthModal(true)}
                                currentTheme={theme}
                                onThemeChange={setTheme}
                                onLocaleChange={handleLocaleChange}
                            />
                        )}
                    </div>
                </aside>

                {!user && (
                    <AuthModal
                        isOpen={showAuthModal}
                        onClose={() => setShowAuthModal(false)}
                        locale={locale}
                    />
                )}
            </>
        </TooltipProvider>
    );
}
