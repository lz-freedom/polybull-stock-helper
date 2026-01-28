# Proposal: 增强 Agent 提示词和 UI

## Context

当前项目有三种 Agent 类型（consensus, research, qa），需要进行以下改进：

1. **提示词优化**：
   - consensus: 多个模型使用同一份专业提示词，基于9部分股票分析报告结构
   - research: 多个模型定义不同专业角色（基于9部分报告结构，可能需要更多角色）
   - 所有代码添加完整清晰的中文注释

2. **前端UI改进**：
   - 单页面根据 agent_type 动态切换组件
   - consensus 展示总报告 + N个模型子报告
   - research 展示单份完整报告
   - 在report页面内嵌QA组件，支持继续沟通
   - 引入 Vercel AI SDK 的 useObject hook 进行流式渲染
   - 一定要让用户看到思考过程

## Goals

- 改造 consensus 和 research 的提示词，基于专业的9部分股票分析报告结构
- 为 research 设计合理的专业角色分工（可能超过4个角色）
- 前端实现动态组件切换，根据 agent_type 展示不同内容
- 实现 consensus 的总报告+子报告列表UI
- 在 report 页面内嵌 QA 组件
- 使用 Vercel AI SDK useObject hook 实现流式渲染
- 代码中添加完整清晰的中文注释
- 让用户能看到 Agent 思考过程

## Non-goals

- 不改变现有的数据库 schema
- 不改变 API 路由的基本结构
- 不改变 Mastra workflow 的事件机制

## Constraints

### MUST

- consensus 必须支持多模型并行调用同一份提示词
- research 必须支持多模型定义不同专业角色
- 不能破坏现有的 agentRuns/agentRunSteps 数据库记录机制
- 保持现有的聊天界面风格和交互模式
- 支持三种 agent_type 的不同展示方式
- 使用 Vercel AI SDK 的 useObject hook 进行流式渲染
- 代码中必须添加完整清晰的中文注释
- 必须展示 Agent 的思考过程给用户

### MUST NOT

- 不能修改数据库 schema（agentRuns, agentRunSteps, reports, reportSections 等表）
- 不能破坏现有的 QA agent 流式聊天功能
- 不能删除或破坏现有的 API 端点
- 不能改变 Mastra workflow 的核心事件协议

### SHOULD

- consensus 的9部分提示词应该专业、用户友好
- research 的角色设计应该合理，覆盖数据获取、基本面分析、估值等各方面
- 流式渲染应该流畅，用户体验好
- UI 组件应该复用 shadcn/ui 现有组件
- 中文注释应该清晰、准确、有助于理解代码逻辑

## Dependencies

- Vercel AI SDK (`ai` package) - 已存在于项目中
- shadcn/ui 组件库 - 已存在于项目中
- Mastra workflow 事件系统 - 已存在于项目中
- 现有的 LLM Client 服务
- 现有的数据库 Schema

## Risks

1. **提示词设计风险**：
   - 9部分报告结构可能导致 LLM 输出不稳定
   - 需要设计合理的 JSON Schema 来约束输出格式
   - 缓解：使用 generateStructuredOutput 强制结构化输出

2. **角色设计风险**：
   - research 角色数量和分工不明确
   - 数据量大时，单个角色可能处理不完
   - 缓解：设计灵活的角色系统，支持动态扩展

3. **流式渲染性能风险**：
   - useObject hook 可能在大量数据时性能下降
   - 缓解：分段渲染，优化数据结构

4. **UI复杂度风险**：
   - 动态组件切换可能导致状态管理混乱
   - 缓解：使用清晰的状态机模式

5. **兼容性风险**：
   - 新旧报告格式可能不兼容
   - 缓解：保留旧格式兼容代码，逐步迁移

## Open Questions

(已通过用户确认解决)

## Success Criteria

### 可验证的成功标准

1. **提示词验证**：
   ```bash
   # 运行 consensus agent，检查输出是否包含9部分内容
   # 运行 research agent，检查是否有正确的角色分工
   ```

2. **流式渲染验证**：
   - 打开 consensus 页面，观察报告是否逐步渲染
   - 打开 research 页面，观察报告是否逐步渲染
   - 检查网络面板，确认使用了 streaming

3. **UI动态切换验证**：
   - 在聊天页面选择不同 agent_type，确认 UI 正确切换
   - consensus 显示总报告+子报告列表
   - research 显示单份报告
   - qa 显示聊天界面

4. **report页面QA验证**：
   - 打开任意 report 页面
   - 确认有 QA 聊天组件
   - 可以在 report 上下文中继续提问

5. **中文注释验证**：
   ```bash
   # 检查修改的文件是否有中文注释
   grep -r "// .*[\u4e00-\u9fa5]" src/features/agents/
   ```

6. **思考过程展示验证**：
   - 运行 consensus/research agent
   - 确认用户能看到每个步骤的进度和思考过程
   - 通过 AgentRunTimeline 或其他UI组件展示
