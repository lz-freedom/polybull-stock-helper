'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';

interface MagicLinkFormProps {
  callbackUrl?: string;
}

export function MagicLinkForm({ callbackUrl = '/dashboard' }: MagicLinkFormProps) {
  const t = useTranslations('auth');
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
      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
        <Mail className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <p className="text-green-800">{t('magicLinkSent')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="magic-email" className="block text-sm font-medium text-gray-700">
          {t('email')}
        </Label>
        <Input
          id="magic-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          required
          className="mt-1 rounded-full"
        />
      </div>
      <Button
        type="submit"
        className="w-full rounded-full bg-orange-600 hover:bg-orange-700"
        disabled={isLoading || !email}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('loading')}
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
