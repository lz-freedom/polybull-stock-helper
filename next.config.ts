import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
    output: 'standalone',
    cacheComponents: false,
    turbopack: {
        // Prevent Next.js from inferring the workspace root from unrelated lockfiles.
        root: process.cwd(),
    },
    async rewrites() {
        return [
            {
                source: '/api/chat',
                destination: '/api/agents/chat',
            },
        ];
    },
};

export default withNextIntl(nextConfig);
