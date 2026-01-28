# Tasks: 增强 Agent 提示词和 UI

## Phase 1: 提示词设计和 Schema 定义

### Task 1.1: 设计 9部分报告 Schema

- [ ] 创建新的 Zod Schema 定义9部分报告结构
- [ ] 包含：核心概览、商业模式、竞争优势、财务质量、管理层治理、估值、未来展望、风险提示、投资结论
- [ ] 添加评分系统 Schema（dimension_details, final_verdict）
- [ ] **Constraint**: 使用 Strict Zod Enums 定义 `role`, `stance`, `priority`
- [ ] 验证：Schema 能正确解析 JSON 输出

**Files:** `src/features/agents/lib/schemas.ts`

**Verify:** `grep -q "export const NinePartReportSchema" src/features/agents/lib/schemas.ts && grep -q "export const ScoreSchema" src/features/agents/lib/schemas.ts`

**Acceptance Criteria:** `NinePartReportSchema` and `ScoreSchema` are exported in `src/features/agents/lib/schemas.ts`; `NinePartReportSchema` includes 9 specific sections; TypeScript compilation succeeds.

---

### Task 1.2: 设计 Research 角色系统

- [ ] 分析9部分报告需要哪些专业角色
- [ ] 设计角色分工（建议：基本面分析师、财务分析师、估值分析师、行业专家、风险分析师等）
- [ ] 为每个角色设计具体的提示词模板
- [ ] 验证：角色分工合理，无重叠和遗漏

**Files:** `src/features/agents/lib/graphs/research.ts`

**Verify:** `grep -q "RESEARCH_ROLES" src/features/agents/lib/graphs/research.ts && grep -q "valuation_analyst" src/features/agents/lib/graphs/research.ts`

**Acceptance Criteria:** `RESEARCH_ROLES` array in `src/features/agents/lib/graphs/research.ts` includes at least 5 specialized roles (e.g. fundamental, financial, valuation, industry, risk).

---

### Task 1.3: 重写 Consensus 提示词

- [ ] 基于9部分报告结构重写 buildAnalysisPrompt
- [ ] 确保所有模型使用同一份提示词
- [ ] **Strategy**: 采用 Active Fetch Pattern (模型主动请求数据)，设置 Fallback 摘要机制
- [ ] 添加清晰的中文注释
- [ ] 验证：生成的报告包含所有9部分内容

**Files:** `src/features/agents/lib/graphs/consensus.ts`

**Verify:** `grep -q "buildAnalysisPrompt" src/features/agents/lib/graphs/consensus.ts`

**Acceptance Criteria:** `buildAnalysisPrompt` function exists in `src/features/agents/lib/graphs/consensus.ts` and references the 9-part structure; contains Chinese comments.

---

### Task 1.4: 重写 Research 提示词

- [ ] 为每个角色重写提示词构建函数
- [ ] 确保每个角色获取到正确的数据子集
- [ ] 添加清晰的中文注释
- [ ] 验证：每个角色输出符合预期

**Files:** `src/features/agents/lib/graphs/research.ts`

**Verify:** `grep -q "buildResearchPrompt" src/features/agents/lib/graphs/research.ts`

**Acceptance Criteria:** `buildResearchPrompt` in `src/features/agents/lib/graphs/research.ts` handles prompt generation for all defined roles; contains Chinese comments.

---

## Phase 2: Backend Workflow 修改

### Task 2.1: 修改 Consensus Workflow

- [ ] 更新 consensus.ts 使用新的提示词和 Schema
- [ ] 确保 reportSections 正确保存每个模型的完整报告
- [ ] **LLM Config**: timeout=600s, retry=3 (exponential), concurrency=model_count
- [ ] **Resiliency**: Implement 50% failure threshold (Majority Strategy)
- [ ] 添加完整清晰的中文注释
- [ ] 验证：workflow 正常运行，数据正确保存

**Files:** `src/features/mastra/workflows/consensus-workflow.ts`, `src/features/agents/lib/graphs/consensus.ts`

**Verify:** `grep -q "NinePartReportSchema" src/features/mastra/workflows/consensus-workflow.ts`

**Acceptance Criteria:** `consensus-workflow.ts` imports and uses `NinePartReportSchema`; Workflow logic saves report sections correctly.

---

### Task 2.2: 修改 Research Workflow

- [ ] 更新 research.ts 使用新的角色系统
- [ ] 修改 RESEARCH_ROLES 为新的专业角色列表
- [ ] 更新提示词构建逻辑
- [ ] **LLM Config**: timeout=600s, retry=3 (exponential), concurrency=model_count
- [ ] **Resiliency**: Implement 50% failure threshold (Majority Strategy)
- [ ] 添加完整清晰的中文注释
- [ ] 验证：workflow 正常运行，角色分工正确

**Files:** `src/features/mastra/workflows/research-workflow.ts`, `src/features/agents/lib/graphs/research.ts`

**Verify:** `grep -q "RESEARCH_ROLES" src/features/mastra/workflows/research-workflow.ts`

**Acceptance Criteria:** `research-workflow.ts` iterates over the updated `RESEARCH_ROLES`; logic supports dynamic role execution.

---

### Task 2.3: 添加思考过程事件

- [ ] 在 workflow 中添加更多 emit 事件，展示思考过程
- [ ] **Protocol**: Implement Dual-stream support (Phase 1: Mastra events)
- [ ] 记录每个步骤的中间结果和推理过程
- [ ] 验证：前端能接收到思考过程事件

**Files:** `src/features/mastra/workflows/consensus-workflow.ts`, `src/features/mastra/workflows/research-workflow.ts`

**Verify:** `grep -q "emit" src/features/mastra/workflows/research-workflow.ts`

**Acceptance Criteria:** Workflows emit events for intermediate steps/reasoning; events include structured data for frontend display.

---

## Phase 3: 前端 UI 改造

### Task 3.1: 安装 Vercel AI SDK

- [ ] 检查 `ai` package 是否已安装
- [ ] 如未安装，运行 `pnpm add ai`
- [ ] 验证：package.json 中有 `ai` 依赖

**Files:** `package.json`

**Verify:** `grep "\"ai\":" package.json`

**Acceptance Criteria:** `ai` package is listed in `dependencies` in `package.json`.

---

### Task 3.2: 创建 Report 页面基础组件

- [ ] 创建 `src/app/[locale]/(dashboard)/reports/[id]/page.tsx`
- [ ] 创建 Report 展示组件（支持 consensus 和 research 不同格式）
- [ ] **Protocol**: 使用 useObject hook 实现 Phase 2 流式渲染 (Report Structure)
- [ ] **UX**: Implement dynamic adaptation for missing sections (do not show empty placeholders)
- [ ] 添加中文注释
- [ ] 验证：Report 页面可以正确渲染

**Files:** `src/app/[locale]/(dashboard)/reports/[id]/page.tsx`, `src/features/agents/components/report-viewer.tsx`

**Verify:** `test -f src/app/[locale]/(dashboard)/reports/[id]/page.tsx && test -f src/features/agents/components/report-viewer.tsx`

**Acceptance Criteria:** Files exist; `ReportViewer` component handles both 'consensus' and 'research' types; uses `useObject` for streaming.

---

### Task 3.3: 实现 Consensus 报告UI

- [ ] 创建总报告展示组件
- [ ] 创建子报告列表组件（展开/折叠）
- [ ] 显示每个模型的 stance、confidence、分析内容
- [ ] 添加中文注释
- [ ] 验证：consensus 报告正确展示总报告和各模型子报告

**Files:** `src/features/agents/components/consensus-report.tsx`

**Verify:** `test -f src/features/agents/components/consensus-report.tsx`

**Acceptance Criteria:** File exists; component renders `overallSummary`, `consensusPoints`, and individual model analyses.

---

### Task 3.4: 实现 Research 报告UI

- [ ] 创建单份报告展示组件
- [ ] 按9部分结构组织内容
- [ ] 显示评分系统和投资结论
- [ ] 添加中文注释
- [ ] 验证：research 报告正确展示所有9部分内容

**Files:** `src/features/agents/components/research-report.tsx`

**Verify:** `test -f src/features/agents/components/research-report.tsx`

**Acceptance Criteria:** File exists; component renders all 9 sections defined in `NinePartReportSchema`.

---

### Task 3.5: 在 Report 页面内嵌 QA 组件

- [ ] 创建内嵌的 QA Chat 组件
- [ ] 支持引用当前 report 作为上下文
- [ ] 使用现有的 sendMessage API，传递 referencedReportIds
- [ ] 添加中文注释
- [ ] 验证：可以在 report 页面中继续提问

**Files:** `src/features/agents/components/embedded-qa-chat.tsx`

**Verify:** `test -f src/features/agents/components/embedded-qa-chat.tsx`

**Acceptance Criteria:** File exists; component accepts `reportId` as prop; calls `sendMessage` with context.

---

### Task 3.6: Chat 页面动态组件切换

- [ ] 修改 chat/page.tsx，根据 agent_type 参数切换组件
- [ ] **Architecture**: 使用 Strategy Pattern (`ChatLayout` + `QAView`/`ConsensusView`/`ResearchView`)
- [ ] 创建选择 agent_type 的 UI（下拉菜单或Tab）
- [ ] qa: 显示聊天界面
- [ ] consensus/research: 显示报告生成界面 + 进度
- [ ] 添加中文注释
- [ ] 验证：切换 agent_type 时 UI 正确变化

**Files:** `src/app/[locale]/(dashboard)/chat/page.tsx`

**Verify:** `grep "agent_type" src/app/[locale]/(dashboard)/chat/page.tsx`

**Acceptance Criteria:** `page.tsx` contains logic to switch between `QAView`, `ConsensusView`, and `ResearchView` based on state/URL param.

---

### Task 3.7: 思考过程展示组件

- [ ] 增强 AgentRunTimeline 组件
- [ ] 显示每个步骤的详细信息和中间结果
- [ ] 展示 LLM 的推理过程（如果有）
- [ ] 添加中文注释
- [ ] 验证：用户能清楚看到 Agent 的思考过程

**Files:** `src/features/agents/components/agent-run-timeline.tsx`

**Verify:** `test -f src/features/agents/components/agent-run-timeline.tsx`

**Acceptance Criteria:** Component accepts and displays detailed step information (inputs, outputs, reasoning) from the agent run.

---

## Phase 4: 集成测试

### Task 4.1: 端到端测试 Consensus

- [ ] 创建新的 consensus session
- [ ] 观察流式渲染过程
- [ ] 检查报告是否包含9部分内容
- [ ] 检查总报告和各模型子报告是否正确展示
- [ ] 在 report 页面中使用 QA 继续提问
- [ ] 验证：完整流程无错误

**Files:** `src/features/agents/lib/graphs/consensus.ts`, `src/features/agents/components/consensus-report.tsx`

**Verify:** `pnpm build`

**Acceptance Criteria:** Application builds successfully; Consensus flow generates a report that renders without errors.

---

### Task 4.2: 端到端测试 Research

- [ ] 创建新的 research session
- [ ] 观察流式渲染过程
- [ ] 检查报告是否包含9部分内容
- [ ] 检查角色分工是否正确
- [ ] 在 report 页面中使用 QA 继续提问
- [ ] 验证：完整流程无错误

**Files:** `src/features/agents/lib/graphs/research.ts`, `src/features/agents/components/research-report.tsx`

**Verify:** `pnpm build`

**Acceptance Criteria:** Application builds successfully; Research flow generates a report that renders without errors.

---

### Task 4.3: 中文注释检查

- [ ] 检查所有修改的文件是否有完整的中文注释
- [ ] 确认注释清晰、准确、有助于理解
- [ ] 验证：所有关键代码都有中文注释

**Files:** All modified files in `src/features/agents/` and `src/features/mastra/`

**Verify:** `grep -r "[\u4e00-\u9fa5]" src/features/agents/lib/graphs/`

**Acceptance Criteria:** Key logic in `consensus.ts`, `research.ts`, and workflows contains explanatory comments in Chinese.

---

## Files to Modify

**Backend:**
- `src/features/agents/lib/schemas.ts` - 添加新的 Schema
- `src/features/agents/lib/graphs/consensus.ts` - 修改提示词和 workflow
- `src/features/agents/lib/graphs/research.ts` - 修改角色和提示词
- `src/features/mastra/workflows/consensus-workflow.ts` - 添加思考过程事件
- `src/features/mastra/workflows/research-workflow.ts` - 添加思考过程事件

**Frontend:**
- 新建 `src/app/[locale]/(dashboard)/reports/[id]/page.tsx`
- 新建 `src/features/agents/components/report-viewer.tsx`
- 新建 `src/features/agents/components/consensus-report.tsx`
- 新建 `src/features/agents/components/research-report.tsx`
- 新建 `src/features/agents/components/embedded-qa-chat.tsx`
- 修改 `src/app/[locale]/(dashboard)/chat/page.tsx`
- 修改 `src/features/agents/components/agent-run-timeline.tsx`

**API:**
- 可能需要修改 API 路由以支持新的流式渲染格式（如果需要）
