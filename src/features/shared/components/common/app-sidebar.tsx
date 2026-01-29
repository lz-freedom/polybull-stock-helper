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
    const { data, error } = useSWR('/api/agents/chat?action=get_user_sessions&limit=20', fetcher, {
        refreshInterval: 0,
        revalidateOnFocus: true
    });

    if (!data?.sessions) return null;

    const sessions = data.sessions as any[];

    // Simple grouping logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const historyGroups = {
        today: [] as any[],
        yesterday: [] as any[],
        previous: [] as any[],
    };

    sessions.forEach(session => {
        const date = new Date(session.createdAt);
        date.setHours(0, 0, 0, 0);
        if (date.getTime() === today.getTime()) {
            historyGroups.today.push(session);
        } else if (date.getTime() === yesterday.getTime()) {
            historyGroups.yesterday.push(session);
        } else {
            historyGroups.previous.push(session);
        }
    });

    return (
        <div className="space-y-4 pr-3 text-sm">
            {historyGroups.today.length > 0 && (
                <div className="space-y-1">
                    <div className="px-2 text-[10px] font-medium text-muted-foreground/70 uppercase">Today</div>
                    {historyGroups.today.map(session => (
                        <Link
                            key={session.id}
                            href={`/${locale}/chat/${session.id}`}
                            className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors truncate",
                                pathname.includes(session.id)
                                    ? "bg-secondary text-foreground font-medium"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                        >
                            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{session.title || 'New Chat'}</span>
                        </Link>
                    ))}
                </div>
            )}
            {historyGroups.yesterday.length > 0 && (
                <div className="space-y-1">
                    <div className="px-2 text-[10px] font-medium text-muted-foreground/70 uppercase">Yesterday</div>
                    {historyGroups.yesterday.map(session => (
                        <Link
                            key={session.id}
                            href={`/${locale}/chat/${session.id}`}
                            className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors truncate",
                                pathname.includes(session.id)
                                    ? "bg-secondary text-foreground font-medium"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                        >
                            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{session.title || 'New Chat'}</span>
                        </Link>
                    ))}
                </div>
            )}
            {historyGroups.previous.length > 0 && (
                <div className="space-y-1">
                    <div className="px-2 text-[10px] font-medium text-muted-foreground/70 uppercase">Previous</div>
                    {historyGroups.previous.map(session => (
                        <Link
                            key={session.id}
                            href={`/${locale}/chat/${session.id}`}
                            className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors truncate",
                                pathname.includes(session.id)
                                    ? "bg-secondary text-foreground font-medium"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                        >
                            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{session.title || 'New Chat'}</span>
                        </Link>
                    ))}
                </div>
            )}
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
        { icon: MessageSquarePlus, labelKey: 'newChat', href: '/' },
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
                        'flex flex-col h-full bg-[#FAFAFA] dark:bg-[#191919] border-r border-border transition-all duration-300',
                        collapsed ? 'w-16' : 'w-[280px]',
                    )}
                >
                    {/* Header: Logo & Toggle */}
                    <div className="flex h-14 items-center px-4 shrink-0">
                        {!collapsed && (
                            <Link href={`/${locale}`}>
                                <Logo size="md" variant="light" />
                            </Link>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCollapsed(!collapsed)}
                            className={cn('ml-auto h-8 w-8 text-muted-foreground hover:text-foreground', collapsed && 'mx-auto')}
                        >
                            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
                        </Button>
                    </div>

                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Main Menu Items */}
                        <div className="px-2 py-2 space-y-1">
                            {menuItems.map((item) => {
                                const isActive = pathname.includes(item.href) && (item.href !== '/' || pathname === `/${locale}`);
                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={`/${locale}${item.href}`}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors h-9',
                                                    isActive
                                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-none'
                                                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                                                    collapsed && 'justify-center px-0 w-9 mx-auto',
                                                )}
                                            >
                                                <item.icon className={cn('h-4 w-4 shrink-0', isActive ? "text-sidebar-primary" : "text-muted-foreground", item.isNew && 'text-rose-500')} />
                                                {!collapsed && (
                                                    <span className={cn('flex-1 truncate', item.isNew && 'text-rose-500')}>
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
                                    <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
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
