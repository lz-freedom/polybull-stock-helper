import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { MainPageClient } from '../../(marketing)/main-page-client';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export default async function PublicHomePage({ params }: PageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <Suspense>
            <MainPageClient locale={locale} />
        </Suspense>
    );
}
