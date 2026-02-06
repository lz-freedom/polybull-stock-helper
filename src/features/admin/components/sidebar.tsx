'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    Users,
    Building2,
    CreditCard,
    Activity,
    Home,
    Shield,
} from 'lucide-react';
import { cn } from '@features/shared/lib/utils';

interface AdminSidebarProps {
    locale: string;
}

export function AdminSidebar({ locale }: AdminSidebarProps) {
    const t = useTranslations('admin');
    const pathname = usePathname();

    const navItems = [
        {
            href: `/${locale}/admin`,
            label: t('title'),
            icon: Home,
            exact: true,
        },
        {
            href: `/${locale}/admin/users`,
            label: t('users'),
            icon: Users,
        },
        {
            href: `/${locale}/admin/teams`,
            label: t('teams'),
            icon: Building2,
        },
        {
            href: `/${locale}/admin/subscriptions`,
            label: t('subscriptions'),
            icon: CreditCard,
        },
        {
            href: `/${locale}/admin/activity`,
            label: t('activityLogs'),
            icon: Activity,
        },
    ];

    return (
        <aside className="w-64 bg-muted text-primary-foreground flex flex-col">
            {/* Logo */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Shield className="h-8 w-8 text-warning" />
                    <span className="text-xl font-bold">{t('title')}</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                                isActive
                                    ? 'bg-warning/10 text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-primary-foreground',
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border">
                <Link
                    href={`/${locale}/dashboard`}
                    className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-primary-foreground transition-colors"
                >
                    <Home className="h-5 w-5" />
                    <span>Back to Dashboard</span>
                </Link>
            </div>
        </aside>
    );
}
