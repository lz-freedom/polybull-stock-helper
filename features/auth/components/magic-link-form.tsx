'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@features/shared/components/ui/button';
import { Input } from '@features/shared/components/ui/input';
import { Label } from '@features/shared/components/ui/label';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

interface MagicLinkFormProps {
    callbackUrl?: string;
}

export function MagicLinkForm({ callbackUrl = '/dashboard' }: MagicLinkFormProps) {
    const t = useTranslations('auth');
    const tCommon = useTranslations('common');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await signIn('email', { 
                email, 
                callbackUrl,
                redirect: false,
            });
            setIsSent(true);
        } catch (error) {
            console.error('Magic link error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSent) {
        return (
            <div className="text-center p-6 bg-chart-1/10 rounded-xl border border-chart-1/20">
                <CheckCircle className="h-10 w-10 text-chart-1 mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">{t('magicLinkSent')}</p>
                <p className="text-muted-foreground text-sm">Check your inbox for the login link</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="magic-email" className="text-foreground">
                    {t('email')}
                </Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="magic-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        required
                        className="pl-10 h-11 rounded-xl bg-background border-border focus:border-primary focus:ring-primary"
                    />
                </div>
            </div>
            <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                disabled={isLoading || !email}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {tCommon('loading')}
                    </>
                ) : (
                    <>
                        <Mail className="mr-2 h-4 w-4" />
                        {t('magicLink')}
                    </>
                )}
            </Button>
        </form>
    );
}
