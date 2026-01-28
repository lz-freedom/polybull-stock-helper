# Design: 增强 Agent 提示词和 UI

## Decision Log

### Decision 1: 9部分报告结构

**问题**: 如何组织股票分析报告的内容结构？

**选项**:
- A. 保持现有简单结构
- B. 采用9部分专业报告结构（核心概览、商业模式、竞争优势、财务质量、管理层治理、估值、未来展望、风险提示、投资结论）
- C. 使用行业标准的其他结构

**决策**: 选择 B - 采用9部分专业报告结构

**理由**: 用户明确要求基于9部分结构，且这个结构专业、全面，适合股票分析

---

### Decision 2: Research 角色设计

**问题**: Research agent 应该使用哪些专业角色？

**选项**:
- A. 保持现有4个角色（fundamental_analyst, technical_analyst, industry_expert, risk_analyst）
- B. 基于9部分报告重新设计角色
- C. 让每个角色负责1-2个报告部分

**决策**: 选择 B - 基于9部分报告重新设计角色，采用以下8个具体角色

**理由**: 需要专业分工以覆盖新的9部分报告结构。

**角色列表与职责**:
1. **基本面分析师 (Fundamental Analyst)**: 负责核心概览、商业模式。关注公司基本业务逻辑和收入来源。
2. **财务分析师 (Financial Analyst)**: 负责财务质量分析。关注三张表、关键财务指标（ROE, margins, etc.）。
3. **估值分析师 (Valuation Analyst)**: 负责估值与安全边际。关注 PE/PS/DCF 等估值模型。
4. **行业专家 (Industry Expert)**: 负责竞争优势与行业地位。关注护城河、市场份额、竞争对手。
5. **公司治理分析师 (Governance Analyst)**: 负责管理层与治理。关注管理层背景、持股、激励机制。
6. **战略分析师 (Strategy Analyst)**: 负责未来展望。关注增长点、战略规划。
7. **风险分析师 (Risk Analyst)**: 负责风险提示。关注宏观、政策、经营等风险。
8. **数据工程师 (Data Engineer)**: 负责从 FactsSnapshot 中提取关键数据点，为其他分析师提供结构化支持。

---

### Decision 3: Streaming Protocol

**问题**: 如何实现报告的流式渲染？

**选项**:
- A. Vercel AI SDK 的 useObject hook
- B. 现有的 SSE (Server-Sent Events)
- C. Dual-stream (Mastra events + streamObject)

**决策**: 选择 C - Dual-stream Protocol

**理由**: 需要同时支持时间轴更新（Phase 1: Mastra events）和结构化报告生成（Phase 2: streamObject）。

**细节**:
- Phase 1: 使用 Mastra workflow events 更新 AgentRunTimeline
- Phase 2: 使用 Vercel AI SDK `streamObject` 传输最终报告数据

---

### Decision 4: Consensus 报告组织

**问题**: Consensus 的"总报告+N个子报告"如何在数据库中组织？

**选项**:
- A. 一条 report 记录 + N条 reportSection 记录（每个模型一个 section）
- B. N+1条 report 记录
- C. 一条 report 记录，所有内容存在 structuredData 中

**决策**: 选择 A - 一条 report + N条 reportSection

**理由**: 现有数据库结构已支持，无需修改 schema，reportSections 可以存储每个模型的完整分析

---

### Decision 5: UI架构

**问题**: Chat 页面如何支持三种 agent_type 的不同UI？

**选项**:
- A. 单页面 + 动态组件切换（基于 agent_type 参数）
- B. 三个独立页面路由 (/chat/qa, /chat/consensus, /chat/research)
- C. Tab/Modal 切换

**决策**: 选择 A - 策略模式 (Strategy Pattern)

**理由**: 使用 ChatLayout 作为容器，View Components 作为策略实现，实现关注点分离和高复用。

**细节**:
- Container: `ChatLayout`
- Strategies: `QAView`, `ConsensusView`, `ResearchView`

---

### Decision 6: LLM Strategy & Resiliency

**问题**: 如何配置 LLM 调用以保证稳定性和性能？

**决策**: 明确的参数配置

**细节**:
- **Timeout**: 600s (10分钟)
- **Retry**: 3次 (Exponential Backoff)
- **Concurrency**: 等于模型数量
- **Failure Threshold**: 50% (Majority Strategy) - 只要有50%的子任务成功即视为整体成功
- **Token Limit**: 仅限制 QA 环节，报告生成不设硬性限制

---

### Decision 7: Schema Strictness

**问题**: 如何保证数据类型的一致性？

**决策**: Strict Enums

**细节**:
- 使用 Zod Enums 严格定义关键字段
- **Fields**: `role`, `stance`, `priority`
- 禁止使用自由文本字符串

---

### Decision 8: Prompt Strategy

**问题**: 如何处理 Token 限制并保证信息质量？

**决策**: Active Fetch Pattern + Fallback

**细节**:
- **Primary**: 模型主动请求数据 (Skill Pattern)，类似 Function Calling
- **Fallback**: 如果 Skill Pattern 不可行，使用单独的 LLM 调用进行摘要
- 避免一次性塞入所有 context

---

### Decision 9: Missing Sections Handling

**问题**: 如果部分分析失败，报告如何展示？

**决策**: Dynamic Adaptation

**细节**:
- 前端 UI 根据返回的数据动态渲染可用部分
- 不展示空白或错误的章节占位符
- UI 自适应布局

---

## Property-Based Testing Properties

### PBT 1: Schema 解析鲁棒性

**属性**: 定义的 Zod Schema 必须能正确解析符合结构的所有 JSON 数据，且对缺失可选字段的情况具有鲁棒性。

**测试策略**:
使用 `fast-check` 生成符合 9部分报告结构的随机 JSON 对象：
1. 生成包含所有字段的完整对象。
2. 生成缺失可选字段的部分对象。
3. 验证 `ReportSchema.parse(generatedObject)` 始终成功。
4. 生成类型错误的对象（如数字字段填字符串），验证 `ReportSchema.parse` 抛出错误。

### PBT 2: 报告结构完整性

**属性**: 无论 Agent 输出的顺序如何，最终组合的报告必须包含预定义的9个部分。

**测试策略**:
模拟 Agent 输出：
1. 创建一个包含9个部分的完整报告对象。
2. 将其打乱顺序或分块（chunk）模拟流式传输。
3. 使用累加器（Reducer）或流式解析器重组数据。
4. 验证重组后的对象 `Object.keys(report)` 包含且仅包含定义的9个部分键值。

### PBT 3: 流式渲染一致性

**属性**: 通过 `useObject` 流式接收的数据最终状态，必须与一次性接收的完整 JSON 数据完全一致。

**测试策略**:
1. 定义一个标准的完整报告 JSON 对象 `targetObject`。
2. 将 `targetObject` 拆分为随机大小的字符流（chunks）。
3. 模拟 `useObject` 的部分解析逻辑处理这些 chunks。
4. 验证流结束时的最终状态 `finalState` 深度等于 `targetObject`。

---

## Architectural Patterns

### Pattern 1: 角色工厂模式

为 Research agent 的角色系统设计工厂模式：

```typescript
interface ResearchRole {
  role: string;
  description: string;
  sections: string[]; // 负责的报告部分
  buildPrompt: (snapshot: FactsSnapshot) => string;
}

class ResearchRoleFactory {
  static create(roleName: string): ResearchRole {
    // 根据角色名称返回对应的角色配置
    // switch(roleName) { case 'Fundamental Analyst': ... }
  }
}
```

### Pattern 2: 策略模式用于 Agent Type 切换

Chat 页面使用策略模式根据 agent_type 渲染不同组件：

```typescript
const AgentUIStrategy = {
  qa: QAChatUI,
  consensus: ConsensusReportUI,
  research: ResearchReportUI,
  // 默认为 QA
  default: QAChatUI
};

function ChatPage({ agentType }) {
  const UIComponent = AgentUIStrategy[agentType] || AgentUIStrategy.default;
  return <UIComponent />;
}
```

### Pattern 3: 适配器模式用于 Report 数据

不同 agent 的报告格式不同，使用适配器统一接口供 UI 消费：

```typescript
interface ReportAdapter {
  getTitle(): string;
  getSections(): Section[];
  getScore(): number | null;
  getConclusion(): string;
}

class ConsensusReportAdapter implements ReportAdapter {
  constructor(private report: ConsensusReport) {}
  // 适配 consensus 报告格式
}

class ResearchReportAdapter implements ReportAdapter {
  constructor(private report: ResearchReport) {}
  // 适配 research 报告格式
}
```
