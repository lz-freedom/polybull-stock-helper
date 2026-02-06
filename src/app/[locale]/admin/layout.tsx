import { requireAdmin } from '@features/auth/lib/admin-guard';
import { AdminSidebar } from '@features/admin/components/sidebar';
import { AdminHeader } from '@features/admin/components/header';
import { setRequestLocale } from 'next-intl/server';
import { SessionProvider } from '@features/shared/providers/session-provider';

interface AdminLayoutProps {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    // 验证管理员权限
    const session = await requireAdmin();

    return (
        <SessionProvider>
            <div className="flex h-screen">
                <AdminSidebar locale={locale} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <AdminHeader user={session.user} />
                    <main className="flex-1 overflow-auto bg-muted p-6">
                        {children}
                    </main>
                </div>
            </div>
        </SessionProvider>
    );
}
