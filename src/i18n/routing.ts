import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
    en: 'English',
    zh: '简体中文',
    ja: '日本語',
};

export const routing = defineRouting({
    locales,
    defaultLocale: 'en',
    localePrefix: 'as-needed', // 默认语言无前缀，其他语言有前缀
});
