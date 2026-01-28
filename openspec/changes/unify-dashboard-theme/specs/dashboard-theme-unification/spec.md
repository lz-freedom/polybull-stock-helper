## ADDED Requirements

### Requirement: 路由结构重组
`src/app/[locale]` 下 MUST 采用 `(main)` route group 管理首页与业务功能：
- `(marketing)` 仅保留纯营销/展示页面；
- `(main)/layout.tsx` MUST 统一提供 AppSidebar + 背景骨架；
- `(main)/(public)` 用于无需登录的主体验入口；
- `(main)/(protected)/layout.tsx` ONLY 负责鉴权，禁止渲染任何 UI 元素；
- 所有受保护功能页（chat/dashboard/settings/share 等） MUST 迁移到 `(main)/(protected)` 路由组。

#### Scenario: 公共首页访问
- **WHEN** 用户访问 `/{locale}` 或 `/{locale}/home`
- **THEN** 页面由 `(main)/(public)/page.tsx` 渲染，并复用 `(main)/layout.tsx` 提供的 AppSidebar 与背景
- **AND** 不触发鉴权逻辑

#### Scenario: 受保护页面访问
- **WHEN** 用户访问 `/{locale}/chat`、`/{locale}/dashboard` 或 `/{locale}/settings`
- **THEN** `(main)/(protected)/layout.tsx` MUST 验证 Session
- **AND** 验证通过后渲染与公共首页一致的布局骨架
- **AND** 若未登录则重定向至 `/{locale}/sign-in`

### Requirement: AppSidebar 单一职责
AppSidebar MUST 仅由 `(main)/layout.tsx` 渲染，任何页面组件禁止重复导入/实例化。布局骨架负责：
- 左侧固定宽度 Sidebar；
- 右侧主内容区 + 营销页背景纹理；
- SessionProvider 包裹整棵子树。

#### Scenario: Chat 页面加载
- **WHEN** 访问 `/{locale}/chat`
- **THEN** Chat 页面组件仅渲染聊天本体，Sidebar/背景由上层 layout 提供
- **AND** DOM 中不存在第二个 Sidebar 实例

### Requirement: 分享页一致性
`/[locale]/share/[shareId]` MUST 迁移至 `(main)/(protected)` 结构（或单独的 `(main)/(public)` 但仍复用主 layout），保证共享报告与应用内查看一致：
- Sidebar 与背景样式相同；
- ReportViewer 外层卡片、CTA 统一；
- 未登录用户若允许访问分享页，需通过显式判定绕过鉴权，但仍使用同一布局。

#### Scenario: 分享链接访问
- **WHEN** 未登录用户打开分享链接
- **THEN** 页面仍显示 Sidebar + 主内容背景，但导航项处于禁用/只读态
- **AND** ReportViewer 内容与应用内一致
- **AND** 如果分享页需要匿名访问，则 `(protected)` layout MUST 允许针对 `/share/*` 设定白名单
