# 重构计划：项目结构 + ESLint + 4 空格缩进

## 目标

1. **清理老路由**：删除 `app/(login)/`、`app/(dashboard)/` 等非 i18n 路由
2. **采用 features 结构**：`app/` 仅放路由层，业务代码迁移到 `features/`
3. **添加 ESLint**：使用 `@stylistic/eslint-plugin` 强制 4 空格缩进
4. **全仓库 4 空格**：包括所有 TS/TSX/JSON 文件

---

## 当前结构

```
polybull-stock-helper/
├── app/
│   ├── [locale]/           # ✅ 保留（国际化路由）
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── (marketing)/
│   │   └── admin/
│   ├── (login)/            # ❌ 删除（老路由）
│   ├── (dashboard)/        # ❌ 删除（老路由）
│   ├── api/                # ✅ 保留
│   ├── layout.tsx          # ✅ 保留
│   └── not-found.tsx       # ✅ 保留
├── components/             # → 迁移到 features/shared/components
├── lib/                    # → 按功能拆分到 features/
├── i18n/                   # ✅ 保留
└── messages/               # ✅ 保留
```

---

## 目标结构

```
polybull-stock-helper/
├── app/                    # 仅路由层（薄层）
│   ├── [locale]/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── (marketing)/
│   │   └── admin/
│   ├── api/
│   ├── layout.tsx
│   └── not-found.tsx
├── features/               # 业务功能模块
│   ├── auth/               # 认证功能
│   │   ├── components/     # LoginForm, GoogleSignInButton...
│   │   ├── actions/        # Server actions
│   │   ├── lib/            # config.ts, session.ts, middleware.ts...
│   │   └── index.ts        # 公开导出
│   ├── admin/              # 管理后台功能
│   │   ├── components/     # AdminSidebar, AdminHeader...
│   │   └── index.ts
│   ├── payments/           # 支付功能
│   │   ├── lib/            # stripe.ts, actions.ts
│   │   └── index.ts
│   ├── teams/              # 团队功能（如有）
│   └── shared/             # 共享模块
│       ├── components/     # UI 组件、通用组件
│       │   ├── ui/         # shadcn/ui
│       │   └── common/     # LocaleSwitcher, Logo...
│       ├── lib/            # utils.ts
│       └── providers/      # SessionProvider...
├── lib/
│   └── db/                 # 数据库（保留，或可移到 features/shared/db）
├── i18n/                   # next-intl 配置
├── messages/               # 翻译文件
├── env/                    # 环境配置
├── eslint.config.mjs       # 新增
├── .editorconfig           # 新增
└── middleware.ts
```

---

## 执行计划

### Phase 1：清理老路由（低风险）

| 步骤 | 操作 | 验证 |
|------|------|------|
| 1.1 | 删除 `app/(login)/` 目录 | - |
| 1.2 | 删除 `app/(dashboard)/` 目录 | - |
| 1.3 | 检查是否有其他文件引用这些路由 | `grep -r "(login)" .` |
| 1.4 | 运行 `pnpm build` 确认无破坏 | 构建成功 |

### Phase 2：创建 features 结构

| 步骤 | 操作 |
|------|------|
| 2.1 | 创建 `features/` 目录结构 |
| 2.2 | 迁移 `components/auth/*` → `features/auth/components/` |
| 2.3 | 迁移 `components/admin/*` → `features/admin/components/` |
| 2.4 | 迁移 `components/ui/*` → `features/shared/components/ui/` |
| 2.5 | 迁移 `components/common/*` → `features/shared/components/common/` |
| 2.6 | 迁移 `components/providers/*` → `features/shared/providers/` |
| 2.7 | 迁移 `lib/auth/*` → `features/auth/lib/` |
| 2.8 | 迁移 `lib/payments/*` → `features/payments/lib/` |
| 2.9 | 保留 `lib/db/` 和 `lib/utils.ts`（或移到 shared） |

### Phase 3：更新路径别名

| 步骤 | 操作 |
|------|------|
| 3.1 | 更新 `tsconfig.json` 添加 `@features/*` 别名 |
| 3.2 | 批量更新所有 import 路径 |
| 3.3 | 运行 `pnpm build` 验证 |

### Phase 4：添加 ESLint + 4 空格

| 步骤 | 操作 |
|------|------|
| 4.1 | 安装依赖：`eslint`, `eslint-config-next`, `@stylistic/eslint-plugin` |
| 4.2 | 创建 `eslint.config.mjs` |
| 4.3 | 创建 `.editorconfig` |
| 4.4 | 添加 `lint` 和 `lint:fix` 脚本 |
| 4.5 | 运行 `pnpm lint:fix` 格式化全仓库 |

### Phase 5：验证

| 步骤 | 验证项 |
|------|--------|
| 5.1 | `pnpm lint` 通过 |
| 5.2 | `pnpm build` 通过 |
| 5.3 | `pnpm dev` 启动正常 |

---

## 路径别名配置（tsconfig.json）

```json
{
    "compilerOptions": {
        "paths": {
            "@/*": ["./*"],
            "@features/*": ["./features/*"]
        }
    }
}
```

---

## ESLint 配置（eslint.config.mjs）

```javascript
import { FlatCompat } from '@eslint/eslintrc';
import stylistic from '@stylistic/eslint-plugin';

const compat = new FlatCompat();

export default [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            '@stylistic/indent': ['error', 4],
            '@stylistic/quotes': ['error', 'single'],
            '@stylistic/semi': ['error', 'always'],
        },
    },
    {
        ignores: ['.next/', 'node_modules/'],
    },
];
```

---

## .editorconfig

```ini
root = true

[*]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

---

## 风险与注意事项

1. **大量 import 路径变更**：使用 IDE 重构功能或脚本批量替换
2. **4 空格格式化产生大量 diff**：建议单独一个 commit
3. **features 结构需要团队认可**：确保团队成员理解新结构

---

## 预计工作量

| 阶段 | 预计时间 |
|------|----------|
| Phase 1 | 5 分钟 |
| Phase 2 | 20 分钟 |
| Phase 3 | 15 分钟 |
| Phase 4 | 10 分钟 |
| Phase 5 | 5 分钟 |
| **总计** | **~55 分钟** |
