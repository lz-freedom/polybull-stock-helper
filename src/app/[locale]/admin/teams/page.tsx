export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { teams, teamMembers } from '@/lib/db/schema';
import { desc, count } from 'drizzle-orm';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TeamsPageProps {
    params: Promise<{ locale: string }>;
}

export default async function TeamsPage({ params }: TeamsPageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations('admin');

    // 获取所有团队及其成员数量
    const allTeams = await db
        .select({
            id: teams.id,
            name: teams.name,
            planName: teams.planName,
            subscriptionStatus: teams.subscriptionStatus,
            createdAt: teams.createdAt,
        })
        .from(teams)
        .orderBy(desc(teams.createdAt));

    // 获取每个团队的成员数量
    const teamMemberCounts = await db
        .select({
            teamId: teamMembers.teamId,
            count: count(),
        })
        .from(teamMembers)
        .groupBy(teamMembers.teamId);

    const memberCountMap = new Map(
        teamMemberCounts.map((t) => [t.teamId, t.count]),
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{t('teams')}</h1>
                <Badge variant="secondary" className="text-sm">
                    {allTeams.length} teams
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Team Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4">Team Name</th>
                                    <th className="text-left py-3 px-4">Members</th>
                                    <th className="text-left py-3 px-4">Plan</th>
                                    <th className="text-left py-3 px-4">Status</th>
                                    <th className="text-left py-3 px-4">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTeams.map((team) => (
                                    <tr key={team.id} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium">{team.name}</td>
                                        <td className="py-3 px-4">
                                            {memberCountMap.get(team.id) || 0} members
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant="outline">
                                                {team.planName || 'Free'}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge
                                                variant={
                                                    team.subscriptionStatus === 'active'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {team.subscriptionStatus || 'No subscription'}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 text-sm">
                                            {new Date(team.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {allTeams.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No teams found
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
