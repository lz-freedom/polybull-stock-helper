'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { X, Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@features/shared/components/common/logo';
import { usePopupLogin } from '@features/auth/hooks/use-popup-login';
import cardBgDark from '@/assets/free-trial/card-bg.jpg';

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
                className="relative w-full max-w-[800px] min-h-[600px] h-fit max-h-[90vh] overflow-hidden bg-background border border-border rounded-lg shadow-2xl flex flex-col sm:flex-row"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={resetModal}
                    className="absolute top-4 right-4 z-20 p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Left: Image Banner */}
                <div className="hidden sm:block w-1/2 relative bg-neutral-900 border-r border-border/50">
                    <div className="absolute inset-0">
                        {/* Using cardBgDark as fallback for sign-in-banner to ensure asset valid */}
                        <div
                            className="w-full h-full bg-cover bg-center opacity-60"
                            style={{ backgroundImage: `url(${cardBgDark.src})` }}
                        />
                    </div>

                    {/* Overlay Text - iVibeFinance Branding */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 text-center">
                        <div className="space-y-4 max-w-[80%]">
                            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                                iVibeFinance
                            </h2>
                            <div className="w-12 h-1 bg-[#BE185D] mx-auto rounded-full" />
                            <p className="text-lg text-white/90 font-medium leading-relaxed">
                                Smart Stock Analysis
                            </p>
                            <p className="text-sm text-white/60 leading-relaxed">
                                AI-driven insights to empower your investment journey.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Form */}
                <div className="w-full sm:w-1/2 p-8 sm:p-10 flex flex-col gap-6 justify-center bg-card">
                    {/* Header */}
                    <div className="flex items-center">
                        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            {t('signInOrUp')}
                        </span>
                    </div>

                    {step === 'email' ? (
                        <div className="flex flex-col gap-4">
                            {/* Email Input */}
                            <div className="flex items-center h-[46px] gap-2 rounded-md border border-input bg-background/50 px-3 transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
                                <Mail className="text-muted-foreground size-4 shrink-0" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('enterEmail')}
                                    className="w-full border-none outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Continue Button (Brand Pink) */}
                            <button
                                onClick={handleSubmitEmail}
                                disabled={!email || isLoading}
                                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap outline-none transition-all duration-300 ease-in-out h-[46px] px-6 py-3 text-sm font-medium leading-[22px] w-full rounded-md disabled:pointer-events-none disabled:opacity-50 bg-[#BE185D] hover:bg-[#9D174D] text-white shadow-sm"
                            >
                                {isLoading ? <Loader2 className="animate-spin size-4" /> : t('continue')}
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-6 my-2">
                                <div className="bg-border h-[1px] w-full" />
                                <span className="text-muted-foreground shrink-0 text-sm">{t('or')}</span>
                                <div className="bg-border h-[1px] w-full" />
                            </div>

                            {/* Google Button */}
                            <button
                                onClick={openGoogleLogin}
                                disabled={isGoogleLoading}
                                className="inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap outline-none h-[46px] px-6 py-3 text-sm font-medium leading-[22px] w-full gap-2 rounded-md border border-input bg-background hover:bg-accent/50 hover:text-accent-foreground transition-all duration-300"
                            >
                                {isGoogleLoading ? (
                                    <Loader2 className="animate-spin size-4" />
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span className="font-medium text-foreground">Continue with Google</span>
                                    </>
                                )}
                            </button>

                            {/* Terms */}
                            <p className="text-muted-foreground text-center text-xs mt-2">
                                *{t('agreeText')}{' '}
                                <Link href="#" className="text-[#BE185D] hover:underline hover:text-[#9D174D]">{t('privacyPolicy')}</Link>
                                {' '}&{' '}
                                <Link href="#" className="text-[#BE185D] hover:underline hover:text-[#9D174D]">{t('termsOfService')}</Link>
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 items-center justify-center py-4">
                            <div className="h-14 w-14 bg-[#BE185D]/10 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-7 w-7 text-[#BE185D]" />
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-xl font-semibold text-foreground">Check your inbox</h2>
                                <p className="text-sm text-muted-foreground">
                                    We've sent a login link to<br />
                                    <span className="text-foreground font-medium">{email}</span>
                                </p>
                            </div>
                            <button
                                onClick={resetModal}
                                className="w-full h-[46px] rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
