import { Button } from '@/components/ui/button';
import { ArrowRight, CreditCard, Database, Globe } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { LocaleSwitcher } from '@/components/common/locale-switcher';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('common');

  return (
    <main>
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold text-orange-600">
              {t('appName')}
            </Link>
            <div className="flex items-center gap-4">
              <LocaleSwitcher />
              <Link href="/pricing">
                <Button variant="ghost">{t('pricing')}</Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" className="rounded-full">
                  {t('signIn')}
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="rounded-full bg-orange-600 hover:bg-orange-700">
                  {t('signUp')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl md:text-6xl">
                Build Your SaaS
                <span className="block text-orange-500">Faster Than Ever</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                Launch your SaaS product in record time with our powerful,
                ready-to-use template. Packed with modern technologies and
                essential integrations.
              </p>
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0 flex gap-4">
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    className="text-lg rounded-full bg-orange-600 hover:bg-orange-700"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg rounded-full"
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <div className="relative w-full rounded-xl bg-gray-900 p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <pre className="text-green-400 text-sm font-mono overflow-x-auto">
                  <code>{`$ pnpm create next-app --example saas-starter
✓ Project created successfully!
✓ PostgreSQL configured
✓ Stripe integration ready
✓ Authentication set up
✓ Admin dashboard included

$ pnpm dev
▲ Ready on http://localhost:3000`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              A complete solution for building your SaaS application
            </p>
          </div>
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {[
              {
                icon: '⚛️',
                title: 'Next.js & React',
                description: 'Modern web technologies for optimal performance.',
              },
              {
                icon: '🗄️',
                title: 'PostgreSQL & Drizzle',
                description: 'Robust database with intuitive ORM.',
              },
              {
                icon: '💳',
                title: 'Stripe Integration',
                description: 'Seamless payment and subscription management.',
              },
              {
                icon: '🌍',
                title: 'Multi-language',
                description: 'Built-in i18n support for global reach.',
              },
            ].map((feature, index) => (
              <div key={index} className="text-center p-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-medium text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to launch your SaaS?
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-orange-100">
            Get started today and build something amazing.
          </p>
          <div className="mt-8">
            <Link href="/sign-up">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg rounded-full"
              >
                Start Free Trial
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>© 2024 {t('appName')}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
