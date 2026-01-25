import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

interface SignInPageProps {
    params: Promise<{ locale: string }>;
}

export default async function SignInPage({ params }: SignInPageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    // 重定向到首页并触发登录弹窗
    redirect(`/${locale}?auth=required`);
}
