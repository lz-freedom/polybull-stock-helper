'use client';

import Link from 'next/link';
import { useState, Suspense, use } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CircleIcon, Home, LogOut, Settings, Shield, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter, useParams } from 'next/navigation';
import { LocaleSwitcher } from '@/components/common/locale-switcher';
import { SessionProvider } from '@/components/providers/session-provider';
import { signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import { isAdmin } from '@/lib/auth/roles';

function UserMenu() {
  const t = useTranslations('common');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const { locale } = useParams();

  async function handleSignOut() {
    await nextAuthSignOut({ callbackUrl: '/sign-in' });
  }

  if (!session?.user) {
    return (
      <>
        <Link
          href={`/${locale}/pricing`}
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {t('pricing')}
        </Link>
        <Button asChild className="rounded-full bg-orange-600 hover:bg-orange-700">
          <Link href={`/${locale}/sign-up`}>{t('signUp')}</Link>
        </Button>
      </>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || 'U';

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage src={user.image || undefined} alt={user.name || ''} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.name || 'User'}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/${locale}/dashboard`} className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>{t('dashboard')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/${locale}/dashboard/general`} className="flex w-full items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>{t('settings')}</span>
          </Link>
        </DropdownMenuItem>
        {isAdmin(user.role) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/${locale}/admin`} className="flex w-full items-center text-orange-600">
                <Shield className="mr-2 h-4 w-4" />
                <span>{t('admin')}</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-red-600"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const t = useTranslations('common');
  const { locale } = useParams();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href={`/${locale}`} className="flex items-center">
          <CircleIcon className="h-6 w-6 text-orange-500" />
          <span className="ml-2 text-xl font-semibold text-gray-900">
            {t('appName')}
          </span>
        </Link>
        <div className="flex items-center space-x-4">
          <LocaleSwitcher />
          <Suspense fallback={<div className="h-9" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <section className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        {children}
      </section>
    </SessionProvider>
  );
}
