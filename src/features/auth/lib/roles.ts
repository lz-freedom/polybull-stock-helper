/**
 * 角色权限系统
 * 定义系统中的角色和权限
 */

// 系统角色定义
export const ROLES = {
    SUPER_ADMIN: 'super_admin',  // 超级管理员 - 所有权限
    ADMIN: 'admin',              // 管理员 - 管理用户和内容
    MEMBER: 'member',            // 普通成员 - 基本权限
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// 团队角色定义 (用于团队内部)
export const TEAM_ROLES = {
    OWNER: 'owner',   // 团队所有者
    MEMBER: 'member', // 团队成员
} as const;

export type TeamRole = typeof TEAM_ROLES[keyof typeof TEAM_ROLES];

// 权限定义
export const PERMISSIONS: Record<Role, readonly string[]> = {
    // 超级管理员 - 所有权限
    super_admin: [
        '*', // 通配符，表示所有权限
    ],
    // 管理员
    admin: [
        'admin:access',           // 访问管理后台
        'users:read',             // 查看用户
        'users:write',            // 编辑用户
        'users:delete',           // 删除用户
        'teams:read',             // 查看团队
        'teams:write',            // 编辑团队
        'subscriptions:read',     // 查看订阅
        'analytics:read',         // 查看分析数据
        'activity:read',          // 查看活动日志
    ],
    // 普通成员
    member: [
        'dashboard:access',       // 访问用户仪表盘
        'profile:read',           // 查看个人资料
        'profile:write',          // 编辑个人资料
        'team:read',              // 查看自己的团队
    ],
} as const;

/**
 * 检查角色是否具有特定权限
 */
export function hasPermission(role: Role, permission: string): boolean {
    const permissions = PERMISSIONS[role];
    if (!permissions) return false;
  
    // 超级管理员拥有所有权限
    if (permissions.includes('*')) return true;
  
    return permissions.includes(permission);
}

/**
 * 检查是否为管理员 (super_admin 或 admin)
 */
export function isAdmin(role: Role | string | null | undefined): boolean {
    if (!role) return false;
    return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

/**
 * 检查是否为超级管理员
 */
export function isSuperAdmin(role: Role | string | null | undefined): boolean {
    if (!role) return false;
    return role === ROLES.SUPER_ADMIN;
}

/**
 * 获取角色显示名称
 */
export function getRoleDisplayName(role: Role | string, locale: string = 'en'): string {
    const displayNames: Record<string, Record<string, string>> = {
        en: {
            super_admin: 'Super Admin',
            admin: 'Admin',
            member: 'Member',
        },
        zh: {
            super_admin: '超级管理员',
            admin: '管理员',
            member: '成员',
        },
        ja: {
            super_admin: 'スーパー管理者',
            admin: '管理者',
            member: 'メンバー',
        },
    };

    return displayNames[locale]?.[role] || displayNames['en'][role] || role;
}

/**
 * 验证角色是否有效
 */
export function isValidRole(role: string): role is Role {
    return Object.values(ROLES).includes(role as Role);
}
