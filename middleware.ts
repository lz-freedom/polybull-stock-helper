import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing, locales } from './i18n/routing';

// 创建 next-intl 中间件
const intlMiddleware = createIntlMiddleware(routing);

// 公开路由（不需要认证）
const publicPaths = [
  '/',
  '/sign-in',
  '/sign-up',
  '/pricing',
  '/api/auth',
  '/api/stripe',
];

// 需要管理员权限的路由
const adminPaths = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 路由直接放行
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 静态资源直接放行
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 处理国际化路由
  const response = intlMiddleware(request);

  // 获取实际路径（去除语言前缀）
  const pathWithoutLocale = getPathWithoutLocale(pathname);

  // 检查是否为公开路由
  const isPublicPath = publicPaths.some(
    (path) => pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
  );

  // 如果是公开路由，直接返回国际化响应
  if (isPublicPath) {
    return response;
  }

  // 检查认证状态（通过 session cookie）
  const sessionCookie = request.cookies.get('authjs.session-token') || 
                        request.cookies.get('__Secure-authjs.session-token') ||
                        request.cookies.get('session'); // 兼容旧的 session

  // 如果没有登录且访问受保护路由，重定向到登录页
  if (!sessionCookie) {
    const locale = getLocaleFromPath(pathname);
    const signInUrl = new URL(locale ? `/${locale}/sign-in` : '/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

/**
 * 从路径中提取语言前缀
 */
function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0] as any)) {
    return segments[0];
  }
  return null;
}

/**
 * 去除路径中的语言前缀
 */
function getPathWithoutLocale(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (locale) {
    return pathname.replace(`/${locale}`, '') || '/';
  }
  return pathname;
}

export const config = {
  // 匹配所有路径，除了 API、静态资源等
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
