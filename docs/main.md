# 完整需求说明（Mastra + AI SDK + Assistant UI）——四模式 + 过程可见 + 报告模式 + 配额

> 核心原则：**尽量复用第三方库/范式**（Mastra、AI SDK、Assistant UI、Exa/Perplexity），只自研必须的核心业务（股票识别、股票数据 Tools 适配、订阅/次数、报告组件渲染与持久化）。

---

## 1. 产品目标
在一个 Chat 页面里提供 4 种模式，让用户既能快速问答，也能生成可交付的研究/共识报告，并且**用户能看到可解释的“思考过程”**（阶段、工具调用、引用来源、分歧点），同时支持**流式输出**、**长任务可恢复/可回放**、**订阅套餐次数限制**。

---

## 2. 四种模式（Mode）
> 统一四字命名：即时问答 / 严谨分析 / 共识分析 / 深度研究  
> 每个模式必须有：模型策略、工具策略、输出形态、计费/次数口径

### 2.1 即时问答
- 简短描述：快速给出结论与要点，适合日常查询与追问
- 模型策略：低延迟模型（默认轻量）
- 工具策略：默认不开重工具；允许轻量工具（股票识别、缓存行情）
- 输出形态：流式文本 + 必要 data parts（如标的卡片）

### 2.2 严谨分析
- 简短描述：更深入拆解问题，给出清晰推理与依据
- 模型策略：思考类/更强推理模型（允许慢一点）
- 工具策略：允许调用股票数据工具与搜索工具（受配额与预算限制）
- 输出形态：流式文本 + 引用/表格/要点等 data parts（不强制生成“报告”）

### 2.3 共识分析（固定 5→1）
- 简短描述：多模型对照同一提示词，输出共识结论与分歧点
- 关键定义（你明确的形态）：
  - 使用 5 家大模型，**同一份提示词** + **同一份上下文包** → 生成 5 份分支报告
  - 再由 1 家“裁判模型”总结 → 生成第 6 份总结报告
- 工具策略：必须接入 Tools（标的识别 + 股票数据 + Exa/Perplexity 搜索）
- 输出形态：
  - Chat 流：边跑边输出阶段/摘要/进度
  - 报告：6 份报告（5 分支 + 1 总结），进入“报告模式”

### 2.4 深度研究（自适应计划 + 讨论式轮询）
- 简短描述：多轮检索与论证，生成结构化研究报告与引用来源
- 编排形态（建议）：
  - “研究计划器（Planner）”先生成 ResearchPlan（动态决定角色/议程/轮次/工具强度）
  - “讨论执行器（Executor）”按计划进行多角色轮询讨论（loop），直到满足收敛条件
- 输出形态：
  - Chat 流：阶段、轮次、工具调用、引用与中间产物持续流式更新
  - 报告：结构化研究报告（Memo），进入“报告模式”

---

## 3. 技术栈与第三方复用策略（必须贯彻）
### 3.1 后端流式与路由（Mastra + AI SDK 兼容格式）
- Next API Route 只做：鉴权/配额校验/选择 mode → 调用 Mastra 的 streaming handler → 返回 AI SDK 兼容流
- 优先使用 Mastra 提供的：
  - chat streaming handler（Agent）
  - workflow streaming handler（Workflow）
  - network streaming handler（Network / Planner）
- 如需自定义 endpoint 变换，使用 Mastra 的 stream → AI SDK stream 转换工具（而不是自定义 SSE 协议）

### 3.2 前端 UI（Assistant UI + AI SDK UI Runtime）
- Assistant UI 作为聊天框架：线程、消息列表、输入区、工具调用 UI 扩展
- AI SDK 作为消息与 parts 协议：文本流 + tool calls + 自定义 data parts
- “富内容渲染”通过 Assistant UI 的 renderer / tool UI 扩展实现，避免自研消息解析器

### 3.3 搜索（尽量用 Mastra 官方 web-search 方案）
- Exa：作为可引用来源抓取/摘要工具（sources）
- Perplexity：作为搜索式聚合/快速线索（可作为模型或 tool）
- 统一输出 sources 结构供报告引用与 UI 展示

---

## 4. 公共能力（Shared Core）——必须自研的最小集合
### 4.1 股票标的识别与标准化（必须自研）
输入：用户问题文本  
输出：标准化标的结构（作为所有工具调用唯一输入）
- symbol
- exchangeAcronym / exchangeCode
- companyName（可选）
- confidence
- candidates（可选：多候选消歧）

### 4.2 股票数据 Tools（必须自研：封装你已有 API）
以 Mastra tool 方式暴露，统一 schema / 错误 / 超时 / 缓存：
- get_latest_price：最新股价
- get_fundamentals：基本面数据
- get_daily_bars：历史日线
- get_returns：回报率
- get_peer_comparison：对比/同业数据
- exa_search：Exa 搜索与可引用片段
- perplexity_search / perplexity_answer：Perplexity 搜索式能力

### 4.3 ContextPack（共用上下文包）生成规则
共识分析与深度研究必须先构建 ContextPack，再进入模型生成阶段：
- 标的识别结果（标准化）
- 股票数据工具结果（按模式/预算选择最小集）
- 搜索 sources（Exa/Perplexity）
- 系统约束（语言、时间范围、用户偏好、预算上限）
- 注意：ContextPack 需要可序列化、可持久化（便于回放与审计）

---

## 5. “思考过程可见”（必须支持，且不输出原始 CoT）
### 5.1 可见内容范围
用户可见的是“可产品化过程事件”，包括：
- 阶段/轮次（正在做什么）
- 工具调用（调用了什么、状态、耗时、结果摘要/关键字段）
- 引用来源（sources）
- 中间产物（表格、对比矩阵、风险树、评分卡、报告大纲）
- 并行分支状态（仅共识：5 模型进度）
- 关键决策/分歧点（为什么认为某证据弱、哪些结论不一致）

### 5.2 过程事件输出方式（统一走 AI SDK parts）
所有过程信息通过 AI SDK 的消息 parts 推送（流式），前端用 Assistant UI 渲染：
- data-stage：阶段开始/结束/当前阶段
- data-round：深研轮次信息（Round i/N，speaker，agenda）
- data-tool-call：工具调用（name、input 摘要、status、latency、error、result 摘要）
- data-sources：新增引用来源列表
- data-branch-status：共识分支 A/B/C/D/E 状态与耗时
- data-artifact：可折叠中间产物（表格/矩阵/图表数据）
- data-step-summary：每步/每轮的“人类可读摘要”（替代 CoT）
- data-decision：关键决策记录（采纳/否决某观点的理由摘要）
- data-report：报告产物（reportId + report 结构化内容或引用）

### 5.3 展示层级（用户可切换）
- 默认：stage + tool-call + sources + step-summary
- 详细（高级套餐或开关）：artifact + branch-status + decision
- 安全与脱敏：tool 输入输出必须脱敏（token、key、隐私字段），结果只展示关键字段摘要

---

## 6. 共识分析详细流程（固定 5→1）
### 6.1 输入
- 用户问题
- 可选：用户指定股票/市场/对比标的/时间范围

### 6.2 执行步骤（Workflow：fan-out/fan-in）
1) 标的识别（必须）
2) 构建 ContextPack（股票数据工具 + Exa/Perplexity 搜索）
3) 并行生成 5 份分支报告（A/B/C/D/E）
   - **同一提示词** + **同一 ContextPack**
   - 输出统一 schema（便于裁判读取）
4) 裁判模型生成总结报告（第 6 份）
   - 输入：5 份分支报告 + ContextPack
   - 输出：共识结论、分歧点、证据强弱、纠错与不确定项、最终可发布摘要
5) 推送 data-report（触发 UI 进入报告模式）
6) 落库：分支报告 + 总结报告 + 全过程事件

### 6.3 输出（共 8 份报告）
- branchReports[7]：每份包含 10 大模块（业务/收入/行业/竞争/财务/风险/管理层/情景/估值/长期论文）
- consensusReport[1]：总结 + 共识 + 分歧 + 证据强弱 + 风险提示 + “我错了的信号”

---

## 7. 深度研究详细流程（Planner + Executor）
### 7.1 ResearchPlan（Planner 输出）
Planner（可用 Network 或专用 Agent）根据用户问题输出结构化计划：
- goal：研究目标一句话
- agenda[]：议程条目（按优先级）
- roles[]：本次启用角色（固定流程角色 + 1–3 专家角色）
- roundsMax：最大轮次（默认 6–10）
- toolPlan：
  - 必要工具列表（price/fundamentals/returns/comps/search）
  - 搜索强度（sources 上限、是否启用 Exa/Perplexity）
  - 预算（最大工具调用数、最大 token、最大耗时）
- stopConditions：收敛条件（满足则提前结束）
- reportTemplate：报告模板（章节结构、必填字段、引用要求）

### 7.2 讨论执行器（Executor：Workflow loop）
1) 标的识别 → ContextPack（按 toolPlan）
2) Round 0：主持人输出议程与成功标准（data-stage/data-round）
3) 每轮：
   - 主持人指派 speaker 角色 + agenda item
   - speaker 输出本轮结论草案（并可触发工具/搜索补证据）
   - 证据官校验：补 sources、标注置信度、列缺口
   - 编辑官更新报告骨架与当前摘要（data-artifact/data-step-summary）
4) 检查 stopConditions：满足则进入 Final
5) Final：生成研究报告（Memo）+ 关键结论/分歧/待验证清单（data-report）
6) 落库：报告 + 全过程事件（可回放）

### 7.3 深度研究角色（TODO 补全：默认可用集合）
固定流程角色（3 个，必开）：
- 研究主持（Moderator/Lead）
- 证据官（Evidence）
- 编辑官（Synthesizer/Editor）

专家角色（按计划启用，每轮只激活 1–2 个）：
- 业务理解（Business Explainer）
- 收入分解（Revenue Decomposer）
- 行业背景（Industry & Trends）
- 竞争格局（Competition & Moat）
- 财务质量（Financial Quality）
- 风险与下跌（Risk / Red Team）
- 管理层与执行（Management & Governance）
- 牛熊情景（Scenario Planner）
- 估值思考（Valuation Narrator）
- 长期论文（Thesis Writer）

---

## 8. Chat 页面与“报告模式”
### 8.1 单页结构
- 顶部：模式选择（四模式）
- 中部：消息流（Assistant UI）
- 支持流式输出：文本 + tool calls + data parts

### 8.2 报告模式（共识/深研完成触发）
- 左侧：报告视图（Report Viewer）
  - 支持章节、数据卡片、评分图表、对比表、引用、分歧点
  - 默认显示“总结报告/最终报告”，分支报告可折叠
- 右侧：继续追问（Follow-up Chat）
  - **只允许**：即时问答 / 严谨分析
  - 追问上下文注入：report 摘要 + 关键结论 + 引用索引（避免塞全量正文导致超上下文）
  - 追问可“引用定位”：用户点某章节/某图表 → 作为 context hint

---

## 9. 富内容样式（必须支持的 data parts）
- data-stock-card：标的卡（symbol/exchange/company/confidence）
- data-fundamentals-table：基本面表（指标/口径/时间）
- data-price-series：价格/日线序列（用于图表）
- data-returns：回报率/区间收益
- data-comparison-table：对比股票数据（peer）
- data-scorecard：评分卡/雷达图数据
- data-citations / data-sources：引用来源列表（可点击）
- data-disagreements：分歧点列表（共识/深研）
- data-report：报告实体（reportId + 结构化内容或存储引用）

---

## 10. 持久化与长任务（建议支持，便于回放与审计）
### 10.1 Thread / Messages
- threads：threadId, userId, title, createdAt
- messages：threadId, messageId, role, parts(JSON), createdAt

### 10.2 Reports
- reports：reportId, threadId, type(consensus/deep), status, summary, content(JSON 或对象存储引用), createdAt
- branch_reports：reportId, modelKey, content(JSON/引用), createdAt（共识的 5 份分支）

### 10.3 Runs / Events（分钟级任务）
- runs：runId, userId, mode, status, input, contextPackRef, startedAt, finishedAt
- events（append-only）：runId, seq, type(stage/tool-call/sources/artifact/branch-status/step-summary/decision/delta/error), payload, createdAt
- 断线重连：前端携带 lastSeq 继续拉取事件
- 回放：打开历史报告可回放时间线（可选开关）

### 10.4 存储策略（防爆库）
- delta 事件节流合并（200–500ms 或 1–2KB）
- 大报告/大 JSON 超阈值转对象存储（DB 存引用 + hash）
- 事件保留 7–30 天（按套餐），报告长期保留；过期可压缩成摘要事件集

---

## 11. 订阅套餐与使用次数（必须自研）
### 11.1 计次维度
每种模式独立计次：
- 即时问答次数
- 严谨分析次数
- 共识分析次数
- 深度研究次数

### 11.2 扣次策略（建议默认）
- 请求进入后端前校验额度
- 共识/深研：启动成功扣 1 次；早期失败可按错误类型回退（需规则）
- 超额降级：
  - 禁止启动共识/深研
  - 允许继续用即时问答/严谨分析追问已生成报告（如果 report 存在）

### 11.3 记录与审计
- usage_counters：userId, mode, used, limit, periodKey
- usage_logs：userId, mode, runId/threadId, delta, reason, ts

---

## 12. 非目标（范围控制）
- 不展示原始模型 CoT
- 不自研 streaming 协议、聊天 UI 框架、工具调用可视化框架（统一复用 AI SDK + Assistant UI）
- 不做复杂金融建模（先聚焦：工具数据卡 + 证据 + 结构化报告 + 可视化）
- 不做通用知识库平台（除非后续明确）

---

## 13. 交付里程碑（建议）
M1：即时问答/严谨分析（流式 + 股票识别 + 基础工具调用展示）
M2：共识分析（固定 7→1 workflow + 8 份报告 + 报告模式 UI）
M3：深度研究（Planner 生成 ResearchPlan + loop 执行 + 报告模式 + 回放）
M4：配额/套餐/事件持久化优化 + 降级策略 + 性能与缓存