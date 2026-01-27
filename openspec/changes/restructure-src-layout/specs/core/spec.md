# 重构源码布局规格文档

## ADDED Requirements

### Requirement: 统一源码目录结构
所有源码文件 MUST 迁移到统一的 `src/` 目录结构中，包括 `src/app`、`src/features`、`src/i18n`、`src/messages`、`src/lib`。

#### Scenario: 验证源码目录统一性
- **Given** 项目完成重构后
- **When** 检查根目录下的源码文件
- **Then** 所有源码文件都位于 `src/` 目录下
- **And** 根目录只保留配置文件和文档

### Requirement: shadcn/ui 组件位置统一
shadcn/ui 组件 MUST 移动到 `src/components/ui`，并且 `components.json` 配置和 TypeScript 路径别名 MUST 保持一致。

#### Scenario: 验证 UI 组件正确加载
- **Given** shadcn/ui 组件已迁移到新位置
- **When** 在页面中导入并使用 Button 组件
- **Then** 组件正确渲染且无导入错误
- **And** TypeScript 类型提示正常工作

#### Scenario: 验证配置文件一致性
- **Given** 组件位置已更新
- **When** 检查 `components.json` 和 `tsconfig.json`
- **Then** 路径别名配置指向 `src/components/ui`
- **And** 配置文件之间无冲突

### Requirement: Next.js v16 文件约定适配
MUST 采用 Next.js v16 的文件约定，使用 `proxy.ts` 作为请求边界文件（不是 `middleware.ts`），并在使用 src 布局时放在 `src/proxy.ts`。

#### Scenario: 验证请求边界文件正确工作
- **Given** 项目使用 src 布局结构
- **When** 创建 `src/proxy.ts` 文件
- **Then** 请求拦截和路由保护功能正常
- **And** 符合 Next.js v16 的文件约定

#### Scenario: 验证中间件迁移
- **Given** 原有 `middleware.ts` 文件存在
- **When** 将其逻辑迁移到 `src/proxy.ts`
- **Then** 所有中间件功能保持不变
- **And** 请求处理流程符合 v16 规范

### Requirement: Next 后端代码分层规范
MUST 采用 Go 开发者思维对 Next 后端代码进行分层：`src/app/api/**` 作为入口层，业务逻辑 MUST 放到 `src/features/**` 的 server-only 区域。

#### Scenario: 验证 API 入口层职责
- **Given** API 路由位于 `src/app/api/**`
- **When** 处理 HTTP 请求
- **Then** 只负责请求解析、响应格式化和错误处理
- **And** 不包含复杂业务逻辑

#### Scenario: 验证业务逻辑分层
- **Given** 业务逻辑位于 `src/features/**/server/`
- **When** 处理核心业务规则
- **Then** 代码与 HTTP 层解耦
- **And** 可以被多个 API 端点复用

#### Scenario: 验证服务端代码隔离
- **Given** feature 模块包含服务端代码
- **When** 标记为 server-only
- **Then** 客户端打包时不会包含这些文件
- **And** 运行时不会意外执行服务端代码