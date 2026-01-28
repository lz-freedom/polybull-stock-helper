import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@features/auth/lib/admin-guard';

export default async function ProtectedLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }>; }) {
    const session = await requireAuth();
    if (!session?.user) {
        const { locale } = await params;
        redirect(`/${locale}/sign-in`);
    }
    return <>{children}</>;
}
