'use client';

import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@features/shared/components/common/locale-switcher';
import { Button } from '@features/shared/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@features/shared/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@features/shared/components/ui/avatar';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

interface AdminHeaderProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string;
    };
}

export function AdminHeader({ user }: AdminHeaderProps) {
    const t = useTranslations('common');
    const tAdmin = useTranslations('admin');

    const initials = user.name
        ? user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
        : user.email?.[0]?.toUpperCase() || 'U';

    return (
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
            <div>
                <h1 className="text-lg font-semibold text-gray-900">{tAdmin('title')}</h1>
            </div>

            <div className="flex items-center gap-4">
                <LocaleSwitcher />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={user.image || undefined} alt={user.name || ''} />
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-1.5">
                            <p className="text-sm font-medium">{user.name || 'User'}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            <p className="text-xs text-orange-600 capitalize mt-1">{user.role}</p>
                        </div>
                        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/sign-in' })}>
                            <LogOut className="mr-2 h-4 w-4" />
                            {t('signOut')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
