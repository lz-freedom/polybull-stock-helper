# Sub-Plan: Unified chat endpoint (QA + rigorous)

## Metadata
- Sub-Plan ID: sub-002
- Plan Type: Sub
- Parent Plan: ../2026-02-01_chat-system-full-alignment.md
- Linked Step: Step 3 - Unify chat endpoint for QA + rigorous analysis
- Created: 2026-02-01T06:11:00Z
- Status: completed
- Created Because: Step 3 changes core API routing/streaming across multiple files (high risk).

---

## Problem analysis

### Background
QA chat uses agent.stream + toAISdkStream while Mastra chat uses handleChatStream; this creates inconsistent tool execution and output.

### Complexity drivers
- Core API behavior change with streaming and tool call completion.
- Needs compatibility with existing clients and stored sessions.

---

## Execution steps

### Step 1: Define unified request/response contract
- Status: completed
- Executed: 2026-02-01 14:13
- AI Score: 85/100
- Goal: ensure /api/agents/chat handles modes and consistent streaming payloads.
- Files:
  - `src/app/api/agents/chat/route.ts`
  - `src/features/agents/lib/chat-contract.ts`
- Actions:
  1. Audit current request payload fields (messages, session_id, mode).
  2. Define unified request shape and response headers.
- Verification:
  - Contract documented in code comments or types.

### Step 2: Implement unified streaming pipeline
- Status: completed
- Executed: 2026-02-01 14:18
- AI Score: 82/100
- Goal: use Mastra streaming handler to complete tool calls and final answers for QA/rigorous.
- Files:
  - `src/app/api/agents/chat/route.ts`
- Actions:
  1. Replace agent.stream + toAISdkStream with handleChatStream or equivalent.
  2. Ensure tool-call → tool-result → final text completes in one stream.
  3. Emit data parts for stage/tool/sources/step-summary.
- Verification:
  - QA prompt produces tool-call + final answer in same stream.

### Step 3: Deprecate/wrap /api/mastra/chat
- Status: completed
- Executed: 2026-02-01 14:20
- AI Score: 85/100
- Goal: remove duplicated behavior, keep compatibility.
- Files:
  - `src/app/api/mastra/chat/route.ts`
- Actions:
  1. Route /api/mastra/chat to unified handler or add deprecation notice.
  2. Ensure existing clients still work.
- Verification:
  - Legacy endpoint returns same stream semantics.

---

## Execution log

| Time | Action | Result |
|------|--------|--------|
| 2026-02-01 14:13 | Step 1 completed | 85/100 |
| 2026-02-01 14:18 | Step 2 completed | 82/100 |
| 2026-02-01 14:20 | Step 3 completed | 85/100 |
