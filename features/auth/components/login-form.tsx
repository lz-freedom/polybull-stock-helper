'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@features/shared/components/ui/button';
import { Input } from '@features/shared/components/ui/input';
import { Label } from '@features/shared/components/ui/label';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { signIn, signUp } from '@features/auth/lib/actions';
import { ActionState } from '@features/auth/lib/middleware';
import { GoogleSignInButton } from './google-sign-in-button';
import { MagicLinkForm } from './magic-link-form';
import { LocaleSwitcher } from '@features/shared/components/common/locale-switcher';
import { Logo } from '@features/shared/components/common/logo';

type AuthMode = 'signin' | 'signup';
type LoginMethod = 'password' | 'magic-link';

interface LoginFormProps {
    mode?: AuthMode;
    locale: string;
}

export function LoginForm({ mode = 'signin', locale }: LoginFormProps) {
    const t = useTranslations('auth');
    const tCommon = useTranslations('common');
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect');
    const priceId = searchParams.get('priceId');
    const inviteId = searchParams.get('inviteId');
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
    const [state, formAction, pending] = useActionState<ActionState, FormData>(
        mode === 'signin' ? signIn : signUp,
        { error: '' },
    );

    return (
        <div className="min-h-[100dvh] flex flex-col bg-background">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-border">
                <Link 
                    href={`/${locale}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">{tCommon('back')}</span>
                </Link>
                <LocaleSwitcher />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo & Title */}
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <Logo size="lg" variant="light" showText={false} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">
                                {mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
                            </h1>
                            <p className="mt-2 text-muted-foreground">
                                {mode === 'signin' 
                                    ? 'Welcome back to iVibeFinance' 
                                    : 'Start your investment journey'}
                            </p>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                        {/* Google Sign In */}
                        <GoogleSignInButton callbackUrl={callbackUrl} />

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-card text-muted-foreground">
                                    {t('orContinueWith')}
                                </span>
                            </div>
                        </div>

                        {/* Login Method Toggle */}
                        <div className="flex gap-2 p-1 bg-muted rounded-xl">
                            <button
                                type="button"
                                onClick={() => setLoginMethod('password')}
                                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    loginMethod === 'password'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t('password')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setLoginMethod('magic-link')}
                                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                                    loginMethod === 'magic-link'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t('magicLink')}
                            </button>
                        </div>

                        {/* Password Form */}
                        {loginMethod === 'password' && (
                            <form className="space-y-4" action={formAction}>
                                <input type="hidden" name="redirect" value={redirect || ''} />
                                <input type="hidden" name="priceId" value={priceId || ''} />
                                <input type="hidden" name="inviteId" value={inviteId || ''} />

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-foreground">
                                        {t('email')}
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            defaultValue={state.email}
                                            required
                                            maxLength={50}
                                            className="pl-10 h-11 rounded-xl bg-background border-border focus:border-primary focus:ring-primary"
                                            placeholder={t('emailPlaceholder')}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-foreground">
                                        {t('password')}
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                                            defaultValue={state.password}
                                            required
                                            minLength={8}
                                            maxLength={100}
                                            className="pl-10 h-11 rounded-xl bg-background border-border focus:border-primary focus:ring-primary"
                                            placeholder={t('passwordPlaceholder')}
                                        />
                                    </div>
                                </div>

                                {state?.error && (
                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center">
                                        {state.error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                    disabled={pending}
                                >
                                    {pending ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                            {tCommon('loading')}
                                        </>
                                    ) : mode === 'signin' ? (
                                        tCommon('signIn')
                                    ) : (
                                        tCommon('signUp')
                                    )}
                                </Button>
                            </form>
                        )}

                        {/* Magic Link Form */}
                        {loginMethod === 'magic-link' && (
                            <MagicLinkForm callbackUrl={callbackUrl} />
                        )}
                    </div>

                    {/* Switch Mode */}
                    <div className="text-center">
                        <p className="text-muted-foreground">
                            {mode === 'signin' ? t('newToPlatform') : t('alreadyHaveAccount')}{' '}
                            <Link
                                href={`/${locale}/${mode === 'signin' ? 'sign-up' : 'sign-in'}${
                                    redirect ? `?redirect=${redirect}` : ''
                                }${priceId ? `&priceId=${priceId}` : ''}`}
                                className="text-primary hover:underline font-medium"
                            >
                                {mode === 'signin' ? t('createAccount') : t('signInToExisting')}
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
