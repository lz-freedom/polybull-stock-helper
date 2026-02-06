export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { users, teams, activityLogs } from '@/lib/db/schema';
import { count, desc } from 'drizzle-orm';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, Activity, CreditCard } from 'lucide-react';

interface AdminPageProps {
    params: Promise<{ locale: string }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations('admin');

    // 获取统计数据
    const [userCount] = await db.select({ count: count() }).from(users);
    const [teamCount] = await db.select({ count: count() }).from(teams);
    const recentActivity = await db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.timestamp))
        .limit(10);

    const stats = [
        {
            title: t('totalUsers'),
            value: userCount?.count || 0,
            icon: Users,
            color: 'text-info',
            bgColor: 'bg-info/10',
        },
        {
            title: t('totalTeams'),
            value: teamCount?.count || 0,
            icon: Building2,
            color: 'text-success',
            bgColor: 'bg-success/10',
        },
        {
            title: t('activeSubscriptions'),
            value: '-',
            icon: CreditCard,
            color: 'text-info',
            bgColor: 'bg-info/10',
        },
        {
            title: t('recentActivity'),
            value: recentActivity.length,
            icon: Activity,
            color: 'text-warning',
            bgColor: 'bg-warning/10',
        },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-muted-foreground">{t('title')}</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('recentActivity')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentActivity.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No recent activity</p>
                    ) : (
                        <div className="space-y-3">
                            {recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-center justify-between py-2 border-b last:border-0"
                                >
                                    <div>
                                        <p className="font-medium">{activity.action}</p>
                                        <p className="text-sm text-muted-foreground">
                                            User ID: {activity.userId} | Team ID: {activity.teamId}
                                        </p>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
