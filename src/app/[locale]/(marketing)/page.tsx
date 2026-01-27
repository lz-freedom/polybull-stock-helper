import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { MainPageClient } from './main-page-client';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export default async function MainPage({ params }: PageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <Suspense>
            <MainPageClient locale={locale} />
        </Suspense>
    );
}
