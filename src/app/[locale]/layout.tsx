import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, Locale } from '@/i18n/routing';
import localFont from 'next/font/local';
import '../globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const anthropicSans = localFont({
    src: [
        {
            path: '../../../public/fonts/AnthropicSans-Variable.ttf',
            weight: '400 600',
            style: 'normal',
        },
    ],
    variable: '--font-sans',
    display: 'swap',
});

const anthropicSerif = localFont({
    src: [
        {
            path: '../../../public/fonts/AnthropicSerif-Variable.ttf',
            weight: '400 650',
            style: 'normal',
        },
    ],
    variable: '--font-serif',
    display: 'swap',
});

const jetbrainsMono = localFont({
    src: [
        {
            path: '../../../public/fonts/JetBrainsMono-VariableFont_wght.ttf',
            weight: '400 700',
            style: 'normal',
        },
        {
            path: '../../../public/fonts/JetBrainsMono-Italic-VariableFont_wght.ttf',
            weight: '400 700',
            style: 'italic',
        },
    ],
    variable: '--font-mono',
    display: 'swap',
});

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // 验证语言是否有效
    if (!routing.locales.includes(locale as Locale)) {
        notFound();
    }

    // 启用静态渲染
    setRequestLocale(locale);

    // 获取翻译消息
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body
                className={`min-h-screen bg-background font-sans antialiased ${anthropicSans.variable} ${anthropicSerif.variable} ${jetbrainsMono.variable}`}
            >
                <NextIntlClientProvider messages={messages}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
