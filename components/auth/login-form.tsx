'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import { signIn, signUp } from '@/app/(login)/actions';
import { ActionState } from '@/lib/auth/middleware';
import { GoogleSignInButton } from './google-sign-in-button';
import { MagicLinkForm } from './magic-link-form';
import { LocaleSwitcher } from '@/components/common/locale-switcher';

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
    { error: '' }
  );

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      {/* 语言切换器 */}
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10">
          {/* Google 登录 */}
          <div className="mb-6">
            <GoogleSignInButton callbackUrl={callbackUrl} />
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          {/* 登录方式切换 */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={loginMethod === 'password' ? 'default' : 'outline'}
              className="flex-1 rounded-full text-sm"
              onClick={() => setLoginMethod('password')}
            >
              {t('password')}
            </Button>
            <Button
              type="button"
              variant={loginMethod === 'magic-link' ? 'default' : 'outline'}
              className="flex-1 rounded-full text-sm"
              onClick={() => setLoginMethod('magic-link')}
            >
              {t('magicLink')}
            </Button>
          </div>

          {/* 密码登录表单 */}
          {loginMethod === 'password' && (
            <form className="space-y-6" action={formAction}>
              <input type="hidden" name="redirect" value={redirect || ''} />
              <input type="hidden" name="priceId" value={priceId || ''} />
              <input type="hidden" name="inviteId" value={inviteId || ''} />

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t('email')}
                </Label>
                <div className="mt-1">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={state.email}
                    required
                    maxLength={50}
                    className="rounded-full"
                    placeholder={t('emailPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('password')}
                </Label>
                <div className="mt-1">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    defaultValue={state.password}
                    required
                    minLength={8}
                    maxLength={100}
                    className="rounded-full"
                    placeholder={t('passwordPlaceholder')}
                  />
                </div>
              </div>

              {state?.error && (
                <div className="text-red-500 text-sm text-center">{state.error}</div>
              )}

              <div>
                <Button
                  type="submit"
                  className="w-full rounded-full bg-orange-600 hover:bg-orange-700"
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
              </div>
            </form>
          )}

          {/* Magic Link 表单 */}
          {loginMethod === 'magic-link' && (
            <MagicLinkForm callbackUrl={callbackUrl} />
          )}

          {/* 切换登录/注册 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {mode === 'signin' ? t('newToPlatform') : t('alreadyHaveAccount')}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                  redirect ? `?redirect=${redirect}` : ''
                }${priceId ? `&priceId=${priceId}` : ''}`}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {mode === 'signin' ? t('createAccount') : t('signInToExisting')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
