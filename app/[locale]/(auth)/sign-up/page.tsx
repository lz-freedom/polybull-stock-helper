import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { setRequestLocale } from 'next-intl/server';

interface SignUpPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm mode="signup" locale={locale} />
    </Suspense>
  );
}
