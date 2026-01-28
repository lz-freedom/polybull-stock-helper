# Spec: Agent Workflow 改造

## ADDED Requirements

### Requirement: Consensus 提示词改造

Consensus agent MUST use a professional prompt based on the 9-part stock analysis report structure. All models MUST use the same prompt. The output MUST comply with the defined Schema (including 9 parts + scoring system).

#### Scenario: 用户请求 Consensus 分析

**Given**: 用户在 Chat 页面选择 "Consensus" agent type  
**When**: 用户输入股票代码并提交  
**Then**:
- 系统创建 consensus agent run
- 显示进度：数据获取 → 模型并行分析 → 综合共识
- 用户能看到每个模型的分析进度
- 最终显示总报告（包含9部分）+ N个模型的子报告
- 每个子报告显示该模型的 stance、confidence、详细分析

---

### Requirement: Research 角色系统改造

Research agent MUST use multiple professional roles, where each role is responsible for specific report sections. Role design MUST be reasonable and cover all 9 sections. Each role MUST have clear responsibility boundaries and prompt templates.

#### Scenario: 用户请求 Research 分析

**Given**: 用户在 Chat 页面选择 "Research" agent type  
**When**: 用户输入股票代码和研究问题并提交  
**Then**:
- 系统创建 research agent run
- 显示进度：数据获取 → 创建研究计划 → 各角色调研 → 综合报告
- 用户能看到每个角色的调研进度和发现
- 最终显示单份完整报告（包含9部分+评分系统）

---

### Requirement: 代码注释

All modified code MUST include complete and clear Chinese comments. Comments MUST explain the purpose, logic, and key design decisions of the code.

#### Scenario: 代码审查验证

**Given**: 开发完成代码修改
**When**: 执行代码审查
**Then**:
- 所有修改的 .ts/.tsx 文件包含中文注释
- 注释清晰解释了代码逻辑和设计决策
- 可以通过 grep 命令验证中文注释覆盖率

---

### Requirement: 思考过程展示

Workflow MUST emit sufficient events to display the Agent's thinking process. Users MUST be able to see the progress and intermediate results of each step.

#### Scenario: 用户观察思考过程

**Given**: Agent 正在运行
**When**: 用户查看进度页面
**Then**:
- AgentRunTimeline 组件显示当前执行的步骤
- 显示每个步骤的详细信息和中间结果
- 用户能理解 Agent 正在做什么

---

### Requirement: Report 页面 QA 集成

Report pages MUST embed a QA chat component. The QA component MUST be able to reference the current report as context.

#### Scenario: 用户在 Report 页面继续提问

**Given**: 用户查看一份 consensus 或 research 报告  
**When**: 用户在内嵌的 QA 组件中输入问题  
**Then**:
- 系统创建 QA session，引用当前 report
- QA agent 基于 report 内容回答问题
- 对话历史保存在 chatMessages 中
