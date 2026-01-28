## Context

- 营销页 `main-page-client.tsx` 具备最新的 hero 背景、AppSidebar、聊天输入区与各类 widget，是唯一正确的视觉与交互源。
- Dashboard 布局(`(dashboard)/layout.tsx`)仍包含传统 SaaS header + content 结构，破坏了主页面全屏体验与暗背景。
- `/chat` 页面虽然部分引用了营销页的背景与输入框，但仍然嵌套在旧 layout、且 session list/ReportViewer 区块未继承主布局的间距与层级。
- 分享页 `/share/[shareId]` 使用简单容器，缺失统一背景及 sidebar。
- 目标：所有真实交互页面（Chat、Share、未来 dashboard 功能）均需复用营销页的布局骨架与主题 token。

## Goals / Non-Goals

**Goals:**
- 让 `(dashboard)` 级别页面默认渲染营销页相同的全屏双栏结构：左侧 AppSidebar、右侧带背景渐变与内层卡片的内容区。
- 移除 `/chat` 中旧 UI 逻辑（如 `renderQAChatUI` 等），直接将 session list + ReportViewer + 输入区嵌入新容器。
- 调整分享页容器，确保共享报告体验与 `/chat` 报告查看时完全一致。
- 保留当前业务逻辑/API 行为，仅重构外层结构与样式。

**Non-Goals:**
- 不新增全新导航或信息架构；不改动 AppSidebar 内容。
- 不改写 agent workflow、API、auth 逻辑，仅触及 UI 容器层。
- 不处理 `/home` 展示页，它保持现状。

## Decisions

1. **统一 Layout 为营销骨架**
   - **选择**：`(dashboard)/layout.tsx` 直接渲染与营销页相同的 `<div className="flex h-screen ...">` + `<AppSidebar>` + `<main>` 结构，不再渲染 header。
   - **原因**：确保所有子页面（chat/share/其他 dashboard 页面）默认继承正确背景与 spacing，避免每个页面重复实现。
   - **备选**：仅在 `/chat` 内复制结构 → 会导致其他 dashboard 页面仍旧老样式，后续还需重复修改，放弃。

2. **共享布局组件化**
   - **选择**：提取公共容器（例如 `DashboardShell`、`DashboardMainBackground` 等）或直接在 layout 中提供 slot，子页面只需填充内容。
   - **原因**：减少重复 CSS，保证 share/chat 一致；可将背景层、最大宽度容器抽象为可复用组件。
   - **备选**：完全在每个页面内手写背景样式 → 容易再次偏离基准。

3. **Chat 页面重构**
   - **选择**：`/chat` 中 session list 改为内置于右侧主容器上方/侧边（仿营销页 widget），并保持 ReportViewer/消息列表在同一滚动容器中。移除 legacy 渲染函数，只保留统一 message UI。
   - **原因**：让用户从首页跳到 `/chat` 毫无违和感，并简化代码路径。
   - **备选**：保留旧容器并仅套一层 wrapper → 外观仍显得像“旧页面套新皮”，而非真正统一。

4. **Share 页面适配**
   - **选择**：分享页使用与 chat 同样的背景与卡片容器，默认只展示 ReportViewer + 顶部 CTA，保持居中布局。
   - **原因**：即便是公共链接，也要延续品牌视觉；减少用户在分享链接中看到“简陋备份版”的错觉。

## Risks / Trade-offs

- **新 layout 影响其他 dashboard 子路由** → 需要验证 `(dashboard)` 下现有页面（如 `/dashboard/general`）在新骨架下是否可接受。若出现兼容问题，需逐页调整或允许某些页面自定义容器。
- **组件抽象不足导致重复** → 若未提炼公共容器，未来新页面仍可能偏离；需在设计阶段定义好顶层组件。
- **性能/滚动行为** → 全屏背景 + 多层滚动容器可能引入滚动条嵌套，需验证聊天区流畅度。
- **分享页登录状态** → Share 页作为公开页面，在继承 sidebar 时需确保不会要求登录；可能需要在 share 页禁用 sidebar（仅保留背景）。

## Migration Plan

1. 重写 `(dashboard)/layout.tsx`：导出新的 shell 结构，并确保 `SessionProvider` 仍包裹子树。
2. 调整 `/chat` 页面：移除旧 header/session list 容器，使用新的 shell slot；确认自动发送流程仍可用。
3. 更新 share 页：在新 layout 下渲染时使用统一容器；若 share 不需要 sidebar，则构造一个独立但一致的 shell。
4. 手动验证 `/chat`、`/share/<id>`、及已知的 dashboard 子页，修正可能的溢出/spacing。

## Open Questions

- 是否需要对未来 dashboard 页面提供多种布局模式（例如有/无 sidebar）？
- 分享页是否应显示 AppSidebar（当前可能需要隐藏）？
