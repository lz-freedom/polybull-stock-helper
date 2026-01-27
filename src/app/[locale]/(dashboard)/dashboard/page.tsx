export const dynamic = 'force-dynamic';

import { requireAuth } from '@features/auth/lib/admin-guard';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Settings, Users, Activity, CreditCard } from 'lucide-react';

interface DashboardPageProps {
    params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    const session = await requireAuth();
    const t = await getTranslations('dashboard');

    const cards = [
        {
            title: t('general'),
            description: 'Manage your profile and account settings',
            href: `/${locale}/dashboard/general`,
            icon: Settings,
        },
        {
            title: t('security'),
            description: 'Update your password and security settings',
            href: `/${locale}/dashboard/security`,
            icon: Activity,
        },
        {
            title: t('team'),
            description: 'Manage your team members',
            href: `/${locale}/dashboard/general`,
            icon: Users,
        },
        {
            title: t('billing'),
            description: 'View and manage your subscription',
            href: `/${locale}/pricing`,
            icon: CreditCard,
        },
    ];

    return (
        <div className="flex-1 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
                    <p className="text-gray-600 mt-2">
                        {t('welcome')}, {session.user.name || session.user.email}!
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {cards.map((card) => (
                        <Link key={card.href} href={card.href}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {card.title}
                                    </CardTitle>
                                    <card.icon className="h-5 w-5 text-gray-400" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-gray-500">{card.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
