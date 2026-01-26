import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('errors');

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-xl text-gray-600">{t('notFound')}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-orange-600 px-6 py-3 text-white hover:bg-orange-700"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
