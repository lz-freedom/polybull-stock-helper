## Why

目前除营销首页 `main-page-client.tsx` 以外的功能页面（尤其是 `/chat`、分享页及 dashboard 布局）仍沿用旧版容器、色板与排版，导致用户从首页跳转后视觉断裂、功能入口位置混乱，且 sidebar 缺失影响核心交互。必须以营销页为唯一真源，统一所有真实功能页面的布局和主题，以消除体验割裂并为后续功能扩展提供一致的骨架。

## What Changes

- 对 `(dashboard)/layout.tsx` 进行重构，移除旧 header/容器，采用营销页同款背景层、双栏结构与 spacing 规则。
- 重写 `/[locale]/(dashboard)/chat/page.tsx` 的结构，完全复用 `main-page-client` 中的 hero、sidebar、message 区组件与分层，淘汰 `renderQAChatUI` / `renderStartRunUI` 等旧 UI 片段。
- 校准分享页 `/[locale]/(dashboard)/share/[shareId]/page.tsx`，确保 ReportViewer 及外围容器沿用统一主题与排版。
- 统一主题 token / Tailwind class，确保未来新增页面默认继承正确样式。

## Capabilities

### New Capabilities
- `dashboard-theme-unification`: 为 dashboard 与交互型页面定义并强制执行与营销页一致的布局、主题与组件栈，确保所有真实功能入口共享同一视觉/交互骨架。

### Modified Capabilities
- *(none)*

## Impact

- 受影响文件：`src/app/[locale]/(dashboard)/layout.tsx`、`src/app/[locale]/(dashboard)/chat/page.tsx`、`src/app/[locale]/(dashboard)/share/[shareId]/page.tsx`、与共享组件如 `ReportViewer`、session 列表和输入区组件。
- 需要重新审核 shadcn/ui 组合、Tailwind class、背景渐变、sidebar 结构以及 IME 输入体验，确保与营销页完全一致。
- 需要验证 share/redirect/session 初始化路径在新布局下仍然可用，并保证与代理路由、auth guard 行为兼容。
