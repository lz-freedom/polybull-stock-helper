# Conflicts Resolution

## Item Template

```yaml
id: <unique-id>
type: <category>
status: <resolved>
owner: <backend|frontend|shared>
description: <brief conflict description>
where: <location in code/arch>
resolution: <decision text>
verify: <verification command/method>
```

## Conflicts

```yaml
id: C-001
type: Architecture
status: RESOLVED
owner: Shared
description: Determine streaming protocol for agent responses
where: Agent/Client Communication
resolution: Dual-stream (Phase 1: Mastra events for timeline; Phase 2: streamObject for report)
verify: Check network tab for Mastra events followed by object stream
```

```yaml
id: C-002
type: Configuration
status: RESOLVED
owner: Backend
description: Define LLM execution parameters and resiliency
where: LLM Service
resolution: timeout=600s, retry=3 (exponential backoff), concurrency=model count, failure_threshold=50% success, token limit only for QA
verify: Inspect LLM config object and simulate timeout/retries
```

```yaml
id: C-003
type: Data Model
status: RESOLVED
owner: Shared
description: Define strictness of schema enums
where: Shared Types
resolution: Strict enums for role/stance/priority
verify: Check Zod schemas enforce enum values strictness
```

```yaml
id: C-004
type: Logic
status: RESOLVED
owner: Backend
description: Handling context limits in prompts
where: Prompt Engineering
resolution: Model actively fetches data (like skill pattern); fallback to separate LLM summarization if skill pattern not feasible
verify: Monitor prompt logs for active data fetching calls
```

```yaml
id: C-005
type: UI Architecture
status: RESOLVED
owner: Frontend
description: Frontend component structure for chat
where: Frontend/Chat
resolution: Strategy pattern (ChatLayout container + view components)
verify: Review ChatLayout component structure for strategy pattern implementation
```

```yaml
id: C-006
type: UX
status: RESOLVED
owner: Frontend
description: Displaying missing report sections
where: Report View
resolution: Dynamic adaptation (show available sections)
verify: Render report with missing sections and verify UI adaptation
```

```yaml
id: C-007
type: Logic
status: RESOLVED
owner: Backend
description: Success criteria for multi-agent operations
where: Orchestrator
resolution: Majority strategy (50% success required)
verify: Simulate 50% sub-task failure and verify operation success
```
