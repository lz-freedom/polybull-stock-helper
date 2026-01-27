import { setRequestLocale } from 'next-intl/server';

interface DashboardLayoutProps {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function DashboardInnerLayout({ 
    children, 
    params, 
}: DashboardLayoutProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    return <>{children}</>;
}
