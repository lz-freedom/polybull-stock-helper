# Polybull Stock Helper

基于 Next.js 15 的全栈 SaaS 应用，支持多语言、多角色权限和管理后台。

## ✨ 功能特性

- 🌍 **多语言支持** - English / 简体中文 / 日本語
- 🔐 **多种登录方式** - Google OAuth / 邮箱密码 / Magic Link
- 👥 **角色权限系统** - 超级管理员 / 管理员 / 成员
- 📊 **管理后台** - 用户管理、团队管理、订阅管理、活动日志
- 💳 **Stripe 集成** - 订阅支付、Webhook 处理
- 🎨 **现代 UI** - shadcn/ui + Tailwind CSS

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 语言 | TypeScript |
| 数据库 | PostgreSQL + Drizzle ORM |
| 认证 | Auth.js v5 (NextAuth) |
| 国际化 | next-intl |
| 支付 | Stripe |
| UI | shadcn/ui + Tailwind CSS 4 |
| 部署 | Vercel |

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone git@github.com:lz-freedom/polybull-stock-helper.git
cd polybull-stock-helper
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 数据库
POSTGRES_URL=postgresql://user:password@localhost:5432/polybull

# Auth.js
AUTH_SECRET=your-secret-key  # 运行: openssl rand -base64 32

# Google OAuth (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
BASE_URL=http://localhost:3000
```

### 3. 初始化数据库

```bash
pnpm db:migrate
pnpm db:seed
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 👤 测试账户

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 超级管理员 | admin@admin.com | admin123 |
| 管理员 | moderator@test.com | admin123 |
| 普通成员 | test@test.com | admin123 |

## 📁 项目结构

```
├── app/
│   ├── [locale]/           # 国际化路由
│   │   ├── (auth)/         # 登录/注册
│   │   ├── (dashboard)/    # 用户仪表盘
│   │   ├── (marketing)/    # 营销页面
│   │   └── admin/          # 管理后台
│   └── api/                # API 路由
├── components/
│   ├── admin/              # 管理后台组件
│   ├── auth/               # 认证组件
│   ├── common/             # 通用组件
│   └── ui/                 # shadcn/ui
├── lib/
│   ├── auth/               # 认证配置
│   ├── db/                 # 数据库
│   └── payments/           # Stripe
├── i18n/                   # 国际化配置
└── messages/               # 翻译文件
```

## 🔧 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm db:migrate   # 运行数据库迁移
pnpm db:seed      # 填充测试数据
pnpm db:studio    # 打开 Drizzle Studio
```

测试账户：

超级管理员：admin@admin.com / admin123
管理员：moderator@test.com / admin123
普通用户：test@test.com / admin123

## 📄 License

MIT
