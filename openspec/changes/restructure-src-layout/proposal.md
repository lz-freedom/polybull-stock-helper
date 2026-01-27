# 重构源码布局

## 上下文 (Context)

当前项目采用混合布局结构：`src/app` 与根目录的 `features/`、`lib/`、`i18n/`、`messages/` 并存。Next.js 版本为 16.1.4，但配置仍使用旧版约定。shadcn/ui 配置指向 `@/components/ui`，但实际组件位于 `features/shared/components/ui`。

## 目标 (Goals)

- 将所有代码迁移到统一的 `src/` 目录结构中
- 采用 Next.js v16 的文件约定（使用 `proxy.ts` 作为请求边界文件）
- 保持现有功能完整性，避免破坏性变更
- 建立清晰的业务逻辑分层：feature 模块化，服务端分离

## 非目标 (Non-goals)

- 添加 Go 代码或服务
- 修改业务逻辑或功能行为
- 更改依赖包版本
- 重命名现有的业务概念或 API

## 约束 (Constraints)

### MUST（必须）
- 所有代码必须在 `src/` 目录下：`src/app`、`src/features`、`src/i18n`、`src/messages`、`src/lib`
- shadcn/ui 组件必须移动到 `src/components/ui`
- 配置和别名必须与新的布局对齐
- Next.js v16 请求边界文件必须命名为 `proxy.ts`
- 业务逻辑必须按 feature 模块组织
- 服务端代码必须在 feature 模块内按 server-only 分离

### MUST NOT（禁止）
- 不得在 `src/` 外创建新的源码目录
- 不得混合服务端和客户端代码在同一文件中
- 不得破坏现有的导入路径约定
- 不得修改 package.json 依赖版本

## 依赖 (Dependencies)

- Next.js v16.1.4 的文件约定
- shadcn/ui 组件的现有配置
- 现有的业务逻辑结构和 API 端点
- 国际化文件的组织方式

## 风险 (Risks)

- 导入路径变更可能导致构建失败
- alias 配置不匹配可能导致组件找不到
- feature 模块边界不清晰可能导致代码重复
- 服务端/客户端代码分离不当可能导致运行时错误

## 开放问题 (Open questions)

（已通过需求分析解决，无遗留开放问题）

## 成功标准 (Success criteria)

- [ ] 所有源码文件都在 `src/` 目录下
- [ ] 项目构建成功，无导入错误
- [ ] shadcn/ui 组件正确加载和渲染
- [ ] 国际化功能正常工作
- [ ] API 路由和服务端操作正常运行
- [ ] 类型检查通过，无 TypeScript 错误
- [ ] 测试套件全部通过
- [ ] 开发服务器和生产构建都正常启动