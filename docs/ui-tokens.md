# UI 设计令牌规范

本文档定义本项目 UI 的样式约束：所有颜色、边框、圆角、状态色必须通过设计令牌提供，禁止在业务代码中写硬编码颜色。

## 1. 令牌来源

唯一来源：`src/app/globals.css`

- 亮色变量：`:root`
- 暗色变量：`.dark`
- Tailwind 语义映射：`@theme inline`

## 2. 允许使用的语义类

在 TS/TSX 中仅允许使用语义 token 类，不允许使用色阶类。

- 背景：`bg-background` `bg-card` `bg-popover` `bg-muted` `bg-accent` `bg-primary` `bg-secondary` `bg-content`
- 文本：`text-foreground` `text-muted-foreground` `text-card-foreground` `text-primary` `text-primary-foreground`
- 边框：`border-border` `border-input`
- 状态：`text-success` `text-warning` `text-info` `text-destructive` 及对应 `bg-*/10` `border-*/30`
- 焦点：`ring-ring`

## 3. 禁止写法

以下写法在业务 UI 中禁止出现：

- `#xxxxxx` / `rgb()` / `rgba()` / `oklch()`
- `text-slate-500` / `bg-gray-100` / `border-zinc-200` 等色阶类
- `bg-black/50` / `text-white` 等直接黑白透明色

## 4. 白名单

当前允许保留硬编码颜色的文件：

- `src/app/globals.css`（令牌定义文件）
- `src/features/auth/lib/email-templates.ts`（邮件模板）
- `src/features/auth/components/google-sign-in-button.tsx`（Google 品牌图标）
- `src/features/shared/components/common/auth-modal.tsx`（Google 品牌图标）

## 5. 质量门禁

- 本地：`pnpm lint`（包含 `eslint` + `lint:tokens`）
- CI：`.github/workflows/ui-quality.yml`

`lint:tokens` 由 `scripts/check-design-tokens.mjs` 实现，对 `src/**/*.ts|tsx|css` 扫描违规模式并阻断提交。

## 6. 新增 token 流程

1. 在 `src/app/globals.css` 的 `:root` 和 `.dark` 新增变量。
2. 在 `@theme inline` 增加 `--color-*` 映射。
3. 在业务组件中仅使用对应语义类。
4. 运行 `pnpm lint` 和 `pnpm build` 验证。
