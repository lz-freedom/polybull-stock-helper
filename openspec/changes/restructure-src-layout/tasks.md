# 重构源码布局任务清单

## 任务1：创建 src 目录结构
Files: src/components, src/components/ui, src/features, src/lib, src/i18n, src/messages
**Steps:**
1. mkdir -p src/components/ui
2. mkdir -p src/features
3. mkdir -p src/lib
4. mkdir -p src/i18n
5. mkdir -p src/messages
**Verify:** test -d src/components && test -d src/components/ui && test -d src/features && test -d src/lib && test -d src/i18n && test -d src/messages
**Acceptance Criteria:** 所有必需的 src 子目录已创建且可访问

## 任务2：移动 features 目录到 src/features
Files: features/*, src/features/*
**Steps:**
1. git mv features/* src/features/
2. rmdir features
**Verify:** test ! -d features && test -d src/features && ls src/features/ | wc -l | grep -q '^0$'
**Acceptance Criteria:** features 目录完全移动到 src/features，原目录已删除

## 任务3：移动 lib 目录到 src/lib
Files: lib/*, src/lib/*
**Steps:**
1. git mv lib/* src/lib/
2. rmdir lib
**Verify:** test ! -d lib && test -d src/lib && ls src/lib/ | wc -l | grep -q '^0$'
**Acceptance Criteria:** lib 目录完全移动到 src/lib，原目录已删除

## 任务4：移动 i18n 和 messages 目录到 src
Files: i18n/*, messages/*, src/i18n/*, src/messages/*
**Steps:**
1. git mv i18n/* src/i18n/
2. git mv messages/* src/messages/
3. rmdir i18n messages
**Verify:** test ! -d i18n && test ! -d messages && test -d src/i18n && test -d src/messages
**Acceptance Criteria:** i18n 和 messages 目录完全移动到 src 下，原目录已删除

## 任务5：移动 proxy.ts 到 src/proxy.ts
Files: proxy.ts, src/proxy.ts
**Steps:**
1. git mv proxy.ts src/proxy.ts
**Verify:** test -f src/proxy.ts && test ! -f proxy.ts
**Acceptance Criteria:** proxy.ts 移动到 src/proxy.ts，保持原有导出名称

## 任务6：移动 shadcn/ui 组件到 src/components/ui
Files: src/features/shared/components/ui/*, src/components/ui/*
**Steps:**
1. git mv src/features/shared/components/ui/* src/components/ui/
2. find src/features/shared/components -type d -empty -delete
**Verify:** ls src/components/ui/ | wc -l | grep -v '^0$' && test ! -d src/features/shared/components/ui
**Acceptance Criteria:** 所有 shadcn/ui 组件移动到 src/components/ui，原路径已清理

## 任务7：更新 shadcn/ui 组件导入路径
Files: **/*.{ts,tsx,js,jsx}
Steps:
1. rg -l '@features/shared/components/ui' --type ts --type tsx | xargs sed -i 's/@features\/shared\/components\/ui/@\/components\/ui/g'
2. rg -l '@/features/shared/components/ui' --type ts --type tsx | xargs sed -i 's/@\/features\/shared\/components\/ui/@\/components\/ui/g'
**Verify:** rg '@features/shared/components/ui' --type ts --type tsx | wc -l | grep '^0$' && rg '@/features/shared/components/ui' --type ts --type tsx | wc -l | grep '^0$'
**Acceptance Criteria:** 所有文件中的旧 shadcn/ui 导入路径已更新为新的 @/components/ui 路径

## 任务8：更新 tsconfig.json 路径别名
Files: tsconfig.json
**Steps:**
1. sed -i 's/"@\/\*": "\.\/\*"/"@\/\*": "\.\/src\/\*"/' tsconfig.json
2. sed -i 's/"@features\/\*": "\.\/features\/\*"/"@features\/\*": "\.\/src\/features\/\*"/' tsconfig.json
**Verify:** grep -E '"@\/\*": "\.\/src\/\*"' tsconfig.json && grep -E '"@features\/\*": "\.\/src\/features\/\*"' tsconfig.json
**Acceptance Criteria:** @/* 别名仅指向 ./src/*，@features/* 指向 ./src/features/*

## 任务9：更新 components.json 别名配置
Files: components.json
**Steps:**
1. sed -i 's/"\\$\{cwd\}\/components"/"\\$\{cwd\}\/src\/components"/' components.json
2. sed -i 's/"\\$\{cwd\}\/components\/ui"/"\\$\{cwd\}\/src\/components\/ui"/' components.json
3. sed -i 's/"\\$\{cwd\}\/lib\/utils"/"\\$\{cwd\}\/src\/lib\/utils"/' components.json
**Verify:** grep '"\\$\{cwd\}\/src\/components"' components.json && grep '"\\$\{cwd\}\/src\/components\/ui"' components.json && grep '"\\$\{cwd\}\/src\/lib\/utils"' components.json
**Acceptance Criteria:** components.json 中所有别名指向新的 src 规范位置

## 任务10：更新 next.config.ts i18n 配置
Files: next.config.ts
**Steps:**
1. sed -i 's/createNextIntlPlugin(\.\/i18n\/request\.ts/createNextIntlPlugin(\.\/src\/i18n\/request\.ts/' next.config.ts
**Verify:** grep 'createNextIntlPlugin(\.\/src\/i18n\/request\.ts' next.config.ts
**Acceptance Criteria:** next.config.ts 使用 src/i18n/request.ts 路径

## 任务11：更新 drizzle.config.ts 路径配置
**Files:** `drizzle.config.ts`
**Steps:**
1. sed -i 's/schema: ".\/lib\/db\/schema"/schema: ".\/src\/lib\/db\/schema"/' drizzle.config.ts
2. sed -i 's/out: ".\/lib\/db\/migrations"/out: ".\/src\/lib\/db\/migrations"/' drizzle.config.ts
**Verify:** grep 'schema: ".\/src\/lib\/db\/schema"' drizzle.config.ts && grep 'out: ".\/src\/lib\/db\/migrations"' drizzle.config.ts
**Acceptance Criteria:** drizzle.config.ts 中所有路径指向 src/lib/db/

## 任务12：更新 package.json 脚本路径
**Files:** `package.json`
**Steps:**
1. sed -i 's/lib\/db\//src\/lib\/db\//g' package.json
**Verify:** grep 'src\/lib\/db' package.json && ! grep 'lib\/db' package.json
**Acceptance Criteria:** package.json 中所有 lib/db/ 引用已更新为 src/lib/db/

## 任务13：修复剩余的旧路径导入
**Files:** `**/*.{ts,tsx,js,jsx}`
**Steps:**
1. rg -l 'from ["\]i18n\/' --type ts --type tsx | xargs sed -i 's/from ["\]i18n\//from "@\/i18n\//g'
2. rg -l 'from ["\]messages\/' --type ts --type tsx | xargs sed -i 's/from ["\]messages\//from "@\/messages\//g'
3. rg -l 'from ["\]lib\/' --type ts --type tsx | xargs sed -i 's/from ["\]lib\//from "@\/lib\//g'
4. rg -l 'from ["\]features\/' --type ts --type tsx | xargs sed -i 's/from ["\]features\//from "@\/features\//g'
**Verify:** rg 'from ["\]i18n\/|from ["\]messages\/|from ["\]lib\/|from ["\]features\/' --type ts --type tsx | wc -l | grep '^0$'
**Acceptance Criteria:** 所有直接引用旧根路径的导入已修复为使用 @ 别名

## 任务14：最终构建验证
**Files:** 构建输出和错误日志
**Steps:**
1. pnpm lint
2. pnpm build
**Verify:** pnpm lint && pnpm build
**Acceptance Criteria:** 项目可以无错误通过 lint 检查并成功构建