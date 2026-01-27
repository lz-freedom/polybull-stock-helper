# 冲突解决账本

## 账本条目

*当前无 OPEN 冲突项目*

## 已解决条目

- id: RESOLVED-001
  type: CONFLICT
  status: RESOLVED
  owner: coder
  description: 初始 tasks.md 包含 TODO 和占位符，不符合零决策要求
  where: openspec/changes/restructure-src-layout/tasks.md
  resolution: 重写 tasks.md 为具体可执行的任务清单，每个任务包含 Files、Steps、Verify、Acceptance Criteria
  verify: rg -n "TODO|TBD|decide later|we'll implement later|it depends|as needed|we'll decide later" openspec/changes/restructure-src-layout/tasks.md | wc -l | grep '^0$'

- id: RESOLVED-002
  type: CONFLICT
  status: RESOLVED
  owner: coder
  description: 初始 design.md 包含未决策项和占位符
  where: openspec/changes/restructure-src-layout/design.md
  resolution: 重写 design.md 包含明确的决策、参数和 PBT 属性
  verify: rg -n "TODO|TBD|decide later|we'll implement later|it depends|as needed|we'll decide later" openspec/changes/restructure-src-layout/design.md | wc -l | grep '^0$'

- id: RESOLVED-003
  type: CONFLICT
  status: RESOLVED
  owner: coder
  description: 初始 conflicts.md 使用检查清单格式而非 Conflict Ledger Template
  where: openspec/changes/restructure-src-layout/reviews/conflicts.md
  resolution: 重写为标准的 Conflict Ledger Template 格式
  verify: grep -q "Conflict Ledger Template" openspec/changes/restructure-src-layout/reviews/conflicts.md