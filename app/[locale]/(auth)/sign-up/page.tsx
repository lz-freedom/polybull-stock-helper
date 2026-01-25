import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

interface SignUpPageProps {
    params: Promise<{ locale: string }>;
}

export default async function SignUpPage({ params }: SignUpPageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    // 重定向到首页并触发登录弹窗
    redirect(`/${locale}?auth=required`);
}
