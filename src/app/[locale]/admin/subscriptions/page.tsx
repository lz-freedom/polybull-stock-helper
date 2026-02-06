export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { teams } from '@/lib/db/schema';
import { desc, isNotNull } from 'drizzle-orm';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SubscriptionsPageProps {
    params: Promise<{ locale: string }>;
}

export default async function SubscriptionsPage({ params }: SubscriptionsPageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations('admin');

    // 获取有订阅的团队
    const subscriptions = await db
        .select()
        .from(teams)
        .where(isNotNull(teams.stripeSubscriptionId))
        .orderBy(desc(teams.updatedAt));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-muted-foreground">{t('subscriptions')}</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Subscription Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4">Team</th>
                                    <th className="text-left py-3 px-4">Plan</th>
                                    <th className="text-left py-3 px-4">Status</th>
                                    <th className="text-left py-3 px-4">Stripe Customer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.map((sub) => (
                                    <tr key={sub.id} className="border-b hover:bg-muted">
                                        <td className="py-3 px-4 font-medium">{sub.name}</td>
                                        <td className="py-3 px-4">
                                            <Badge variant="outline">{sub.planName || 'Unknown'}</Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge
                                                variant={
                                                    sub.subscriptionStatus === 'active'
                                                        ? 'default'
                                                        : sub.subscriptionStatus === 'canceled'
                                                            ? 'destructive'
                                                            : 'secondary'
                                                }
                                            >
                                                {sub.subscriptionStatus}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                                            {sub.stripeCustomerId?.slice(0, 20)}...
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {subscriptions.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No active subscriptions
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
