'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { X, Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@features/shared/components/common/logo';
import { usePopupLogin } from '@features/auth/hooks/use-popup-login';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    locale: string;
}

export function AuthModal({ isOpen, onClose, locale }: AuthModalProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'email' | 'sent'>('email');
    const t = useTranslations('sidebar');

    const { isLoading: isGoogleLoading, openGoogleLogin } = usePopupLogin({
        onSuccess: () => {
            resetModal();
            window.location.reload();
        },
        onError: (error) => {
            console.error('Google sign in error:', error);
        },
    });

    if (!isOpen) return null;

    const handleSubmitEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);

        try {
            const csrfRes = await fetch('/api/auth/csrf');
            const { csrfToken } = await csrfRes.json();

            const res = await fetch('/api/auth/signin/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    csrfToken,
                    callbackUrl: window.location.href,
                    redirect: false,
                    json: true,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                console.error('Magic link response error:', data);
                throw new Error(data.message || 'Failed to send');
            }

            setStep('sent');
        } catch (error) {
            console.error('Magic link error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetModal = () => {
        setStep('email');
        setEmail('');
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={resetModal}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
            {/* Modal */}
            <div 
                className="relative w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal content */}
                <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
                    {/* Close button */}
                    <button
                        onClick={resetModal}
                        className="absolute top-4 right-4 z-10 p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* Content */}
                    <div className="p-8">
                        {step === 'email' ? (
                            <>
                                {/* Logo */}
                                <div className="flex justify-center mb-6">
                                    <Logo size="lg" variant="light" showText={false} />
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl font-semibold text-foreground text-center mb-2">
                                    {t('signInOrUp')}
                                </h2>
                                <p className="text-muted-foreground text-center mb-8">
                                    Welcome to iVibeFinance
                                </p>

                                {/* Email Form */}
                                <form onSubmit={handleSubmitEmail} className="space-y-4">
                                    {/* Email Input */}
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder={t('enterEmail')}
                                            className="w-full bg-background border border-border rounded-xl px-4 py-3 pl-11 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                            disabled={isLoading}
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        disabled={!email || isLoading}
                                        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                {t('continue')}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </form>

                                {/* Divider */}
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-3 bg-card text-muted-foreground">{t('or')}</span>
                                    </div>
                                </div>

                                {/* Google Button */}
                                <Button
                                    variant="outline"
                                    className="w-full h-12 bg-background hover:bg-accent border-border text-foreground rounded-xl font-medium transition-colors"
                                    onClick={openGoogleLogin}
                                    disabled={isGoogleLoading}
                                >
                                    {isGoogleLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                            Continue with Google
                                        </>
                                    )}
                                </Button>

                                {/* Terms */}
                                <p className="text-xs text-center text-muted-foreground mt-6 leading-relaxed">
                                    {t('agreeText')}{' '}
                                    <Link href="#" className="text-primary hover:underline">{t('privacyPolicy')}</Link>
                                    {' '}&{' '}
                                    <Link href="#" className="text-primary hover:underline">{t('termsOfService')}</Link>
                                </p>

                                {/* Link to full sign in page */}
                                <div className="mt-6 pt-6 border-t border-border text-center">
                                    <Link
                                        href={`/${locale}/sign-in`}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={resetModal}
                                    >
                                        More sign in options →
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center py-6">
                                    <div className="flex justify-center mb-6">
                                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                                            <CheckCircle className="h-8 w-8 text-primary" />
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-semibold text-foreground mb-3">
                                        Check your inbox
                                    </h2>
                                    <p className="text-muted-foreground mb-8">
                                        We've sent a login link to <br />
                                        <span className="text-foreground font-medium">{email}</span>
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={resetModal}
                                        className="w-full h-12 rounded-xl"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
