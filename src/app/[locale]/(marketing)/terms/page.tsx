import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Logo } from '@/features/shared/components/common/logo';
import Link from 'next/link';

interface TermsPageProps {
    params: Promise<{ locale: string }>;
}

export default async function TermsPage({ params }: TermsPageProps) {
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
                    <h1>Terms of Service</h1>
                    <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

                    <h2>1. Agreement to Terms</h2>
                    <p>These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and iVibeFinance ("we," "us" or "our"), concerning your access to and use of the iVibeFinance website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").</p>

                    <h2>2. Intellectual Property Rights</h2>
                    <p>Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights and unfair competition laws.</p>

                    <h2>3. User Representations</h2>
                    <p>By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Terms of Service.</p>

                    <h2>4. Fees and Payment</h2>
                    <p>We accept the following forms of payment: Visa, Mastercard, American Express, Discover, PayPal. You may be required to purchase or pay a fee to access some of our services. You agree to provide current, complete, and accurate purchase and account information for all purchases made via the Site.</p>

                    <h2>5. Term and Termination</h2>
                    <p>These Terms of Service shall remain in full force and effect while you use the Site. WITHOUT LIMITING ANY OTHER PROVISION OF THESE TERMS OF SERVICE, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SITE (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON.</p>
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
