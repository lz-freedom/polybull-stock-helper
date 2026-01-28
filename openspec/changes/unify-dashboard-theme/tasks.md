## 1. 路由与布局重构

- [ ] 1.1 在 `src/app/[locale]/(main)/layout.tsx` 搭建统一骨架（SessionProvider + AppSidebar + 背景）
- [ ] 1.2 新建 `src/app/[locale]/(main)/(public)/page.tsx`，迁移原营销页主体
- [ ] 1.3 新建 `src/app/[locale]/(main)/(protected)/layout.tsx`，实现鉴权包装
- [ ] 1.4 更新导航/链接指向 `(main)` 结构，确保 /chat、/dashboard、/settings 路径不变

## 2. 页面迁移与清理

- [ ] 2.1 将 `/chat` 页面移动至 `(main)/(protected)`，移除内部 Sidebar/header
- [ ] 2.2 将 `/dashboard`、`/settings`、share 页面迁移并适配统一布局
- [ ] 2.3 确认 `/share/[shareId]` 在新布局下支持匿名访问（如需白名单）
- [ ] 2.4 删除旧 `(dashboard)` layout/header 及冗余样式

## 3. 验证与回归

- [ ] 3.1 手动验证 `/`, `/chat`, `/dashboard`, `/settings`, `/share/:id` 的布局一致性
- [ ] 3.2 回归 session 创建 / 自动跳转 / AuthModal 流程
- [ ] 3.3 补充/更新相关文档或注释（如 AGENTS.md 中的结构说明）
