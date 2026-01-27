export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { desc, isNull } from 'drizzle-orm';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getRoleDisplayName } from '@features/auth/lib/roles';

interface UsersPageProps {
    params: Promise<{ locale: string }>;
}

export default async function UsersPage({ params }: UsersPageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations('admin');

    // 获取所有用户（排除已删除的）
    const allUsers = await db
        .select()
        .from(users)
        .where(isNull(users.deletedAt))
        .orderBy(desc(users.createdAt));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{t('users')}</h1>
                <Badge variant="secondary" className="text-sm">
                    {allUsers.length} users
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('userManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4">User</th>
                                    <th className="text-left py-3 px-4">Email</th>
                                    <th className="text-left py-3 px-4">Role</th>
                                    <th className="text-left py-3 px-4">Created</th>
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allUsers.map((user) => {
                                    const initials = user.name
                                        ? user.name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')
                                            .toUpperCase()
                                        : user.email[0].toUpperCase();

                                    return (
                                        <tr key={user.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.image || undefined} />
                                                        <AvatarFallback>{initials}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{user.name || 'No name'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{user.email}</td>
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant={
                                                        user.role === 'super_admin'
                                                            ? 'destructive'
                                                            : user.role === 'admin'
                                                                ? 'default'
                                                                : 'secondary'
                                                    }
                                                >
                                                    {getRoleDisplayName(user.role, locale)}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-gray-500 text-sm">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <button className="text-orange-600 hover:text-orange-800 text-sm">
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {allUsers.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No users found
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
