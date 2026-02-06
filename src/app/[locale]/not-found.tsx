import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFound() {
    const t = useTranslations('errors');

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-muted">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
                <p className="mt-4 text-xl text-muted-foreground">{t('notFound')}</p>
                <Link
                    href="/"
                    className="mt-6 inline-block rounded-full bg-warning/10 px-6 py-3 text-primary-foreground hover:bg-warning/10"
                >
                    Go Home
                </Link>
            </div>
        </div>
    );
}
