import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Logo } from '@/features/shared/components/common/logo';
import Link from 'next/link';

interface PrivacyPageProps {
    params: Promise<{ locale: string }>;
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
    const { locale } = await params;
    setRequestLocale(locale);
    const common = await getTranslations('common');

    return (
        <main className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <Link href={`/${locale}/home`}>
                        <Logo size="md" variant="auto" />
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-4xl px-6 py-32 sm:py-40">
                <article className="prose prose-neutral dark:prose-invert max-w-none">
                    <h1>Privacy Policy</h1>
                    <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

                    <h2>1. Introduction</h2>
                    <p>Welcome to iVibeFinance ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us.</p>

                    <h2>2. Information We Collect</h2>
                    <p>We collect personal information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website or otherwise when you contact us.</p>

                    <h2>3. How We Use Your Information</h2>
                    <p>We use personal information collected via our website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>

                    <h2>4. Will Your Information Be Shared With Anyone?</h2>
                    <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.</p>

                    <h2>5. How Long Do We Keep Your Information?</h2>
                    <p>We keep your information for as long as necessary to fulfill the purposes outlined in this privacy notice unless otherwise required by law.</p>
                </article>
            </div>

            <footer className="border-t border-border/50 bg-muted/20 px-6 py-10 text-muted-foreground">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <Logo size="sm" variant="auto" />
                    <p>© {new Date().getFullYear()} {common('appName')}. All rights reserved.</p>
                </div>
            </footer>
        </main>
    );
}
