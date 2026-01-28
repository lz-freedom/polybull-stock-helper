'use client';

import { use } from 'react';
import { AppSidebar } from '@features/shared/components/common/app-sidebar';
import { cn } from '@/lib/utils';
import { SessionProvider } from '@features/shared/providers/session-provider';

export default function MainLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }>; }) {
    const { locale } = use(params);
    return (
        <SessionProvider>
            <div className="h-screen overflow-hidden bg-[#F7F8FA] dark:bg-[#0F1114] flex">
                <AppSidebar locale={locale} />
                <main className="flex-1 flex flex-col relative bg-[#F7F8FA] dark:bg-[#0F1114] overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle, rgba(var(--marketing-dots-bg-rgb), 0) 0%, rgba(var(--marketing-dots-bg-rgb), 0) 55%, rgba(var(--marketing-dots-bg-rgb), 1) 85%), radial-gradient(circle, rgba(var(--marketing-dots-rgb), 0.22) 1px, transparent 1px)',
                            backgroundRepeat: 'no-repeat, repeat',
                            backgroundPosition: 'center, center',
                            backgroundSize: 'auto, 14px 14px',
                        }}
                    />
                    <div className="flex-1 relative z-10 flex flex-col items-center px-4 md:px-8 py-6 overflow-y-auto">
                        <div className={cn('w-full', 'max-w-4xl')}
                        >
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </SessionProvider>
    );
}
