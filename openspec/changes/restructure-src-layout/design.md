# 重构源码布局设计文档

## 最终决策和参数

### 目录结构决策

**最终目录布局：**
```
src/
├── app/                    # Next.js App Router (保持不变)
├── components/
│   └── ui/                 # shadcn/ui 组件规范位置
├── features/               # 业务功能模块
│   └── [feature-name]/
│       ├── components/     # 特定功能组件
│       ├── server/         # 服务端逻辑
│       └── index.ts        # 公共导出
├── lib/                    # 共享工具和类型
│   ├── auth/               # 认证相关
│   ├── db/                 # 数据库相关
│   ├── payments/           # 支付相关
│   └── utils.ts            # 通用工具
├── i18n/                   # 国际化配置
│   └── request.ts          # 国际化请求处理
├── messages/               # 翻译文件
│   ├── en.json
│   ├── zh.json
│   └── ja.json
└── proxy.ts                # Next.js v16 请求边界
```

### 导入规则决策

**规范导入规则：**
- **shadcn/ui 组件：** 必须使用 `@/components/ui/*` 别名
- **功能模块：** 使用 `@features/*` 别名指向 `./src/features/*`
- **共享工具：** 使用 `@/lib/*` 别名
- **国际化：** 使用 `@/i18n/*` 和 `@/messages/*` 别名

**别名映射：**
```json
{
  "@/*": "./src/*",
  "@/components/*": "./src/components/*",
  "@/components/ui/*": "./src/components/ui/*",
  "@/lib/*": "./src/lib/*",
  "@/features/*": "./src/features/*",
  "@/i18n/*": "./src/i18n/*",
  "@/messages/*": "./src/messages/*"
}
```

### Next.js 后端分层架构

**Go Developer Thinking 分层规则：**

1. **入口层 (Entry Layer)：**
   - `src/app/api/**` - API 路由处理器
   - Server Actions - 分布在各 feature 中
   - 职责：HTTP 请求处理、参数验证、响应格式化

2. **域/服务层 (Domain/Service Layer)：**
   - `src/features/**/server/**` - 业务逻辑实现
   - **决策：立即创建这些文件夹结构**
   - 包含：services、repositories、domain logic
   - 职责：业务规则、数据转换、事务协调

3. **共享类型/工具层 (Shared Layer)：**
   - `src/lib/**` - 跨功能共享代码
   - 包含：类型定义、工具函数、常量、配置
   - 职责：通用抽象、基础设施代码

### 请求边界策略

**Next.js v16 约定适配：**
- 使用 `src/proxy.ts` 作为全局请求边界（替代 `middleware.ts`）
- 实现精确的 matcher 规则进行路由过滤
- 保持现有的导出名称 `proxy` 不变
- 支持国际化、认证、日志等横切关注点

**Matcher 策略参数：**
```typescript
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 迁移策略参数

**文件移动规则：**
- 所有移动操作使用 `git mv` 保持文件历史
- 要求零行为变更，仅调整位置和导入路径
- 移动后验证构建成功才能继续下一步
- 每个移动步骤都是原子操作，失败时可回滚

**依赖更新策略：**
- 优先更新路径别名配置文件
- 批量替换导入路径使用精确的正则表达式
- 验证每个步骤的类型检查通过

## 基于属性的测试 (PBT Properties)

### 导入确定性属性
**不变量：** 每个导入路径只能解析到一个唯一的文件
**定义：** 对于任意有效的导入语句，TypeScript 编译器只能解析出一个具体的文件路径
**边界条件：** 
- 别名重叠（如 @/* 和 @/lib/*）
- 相对路径与绝对路径冲突
- 循环导入
**证伪策略：** 随机生成导入语句，检查 TypeScript 编译器是否报歧义错误

### 无根源规则属性
**不变量：** 所有 TypeScript/TSX 源文件必须位于 src 目录内
**定义：** 除配置文件和脚本外，项目根目录不应包含任何 .ts、.tsx、.js、.jsx 文件
**边界条件：**
- 配置文件（tsconfig.json, next.config.ts 等）
- 构建脚本和工具文件
- 测试文件（如果有在 tests/ 目录）
**证伪策略：** 扫描项目根目录，验证所有源文件都在 src/ 内

### 构建/Lint 稳定性属性
**不变量：** 在相同输入下，构建和 lint 结果必须一致
**定义：** 重复执行 `pnpm lint` 和 `pnpm build` 应该产生相同的成功/失败结果
**边界条件：**
- 缓存清理后的首次构建
- 并发构建执行
- 不同操作系统下的构建
**证伪策略：** 多次执行构建命令，检查结果是否一致

### i18n 消息加载路径正确性属性
**不变量：** 国际化系统必须从正确的路径加载消息文件
**定义：** 所有语言的消息文件都应该从 `src/messages/` 目录加载
**边界条件：**
- 动态语言切换
- 缺失的消息文件
- 消息文件格式错误
**证伪策略：** 启动应用并验证每个语言的翻译都能正确加载