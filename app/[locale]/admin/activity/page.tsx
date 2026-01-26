export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { activityLogs, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  // 获取所有活动日志
  const activities = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userId: activityLogs.userId,
      teamId: activityLogs.teamId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('activityLogs')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between py-3 border-b last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{activity.action}</Badge>
                    <span className="text-sm text-gray-500">
                      by {activity.userName || activity.userEmail || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Team ID: {activity.teamId} | IP: {activity.ipAddress || 'N/A'}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            ))}

            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No activity logs
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
