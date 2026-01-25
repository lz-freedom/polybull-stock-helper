import { auth } from './config';
import { redirect } from 'next/navigation';
import { isAdmin, isSuperAdmin, type Role } from './roles';

/**
 * 要求管理员权限的服务端保护
 * 用于 Server Components 和 Route Handlers
 */
export async function requireAdmin() {
    const session = await auth();

    if (!session?.user) {
        redirect('/sign-in');
    }

    if (!isAdmin(session.user.role)) {
        redirect('/dashboard'); // 无权限，重定向到用户面板
    }

    return session;
}

/**
 * 要求超级管理员权限
 */
export async function requireSuperAdmin() {
    const session = await auth();

    if (!session?.user) {
        redirect('/sign-in');
    }

    if (!isSuperAdmin(session.user.role)) {
        redirect('/dashboard');
    }

    return session;
}

/**
 * 要求登录的服务端保护
 */
export async function requireAuth() {
    const session = await auth();

    if (!session?.user) {
        redirect('/sign-in');
    }

    return session;
}

/**
 * 获取当前会话（不重定向）
 */
export async function getSession() {
    return await auth();
}

/**
 * 检查当前用户是否有特定权限
 */
export async function checkPermission(permission: string): Promise<boolean> {
    const session = await auth();
    if (!session?.user) return false;

    const role = session.user.role as Role;
  
    // 导入权限检查
    const { hasPermission } = await import('./roles');
    return hasPermission(role, permission);
}
