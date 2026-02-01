# Task Plan: Chat system alignment with docs/main.md

## Metadata
- Plan ID: plan-20260201-054826Z
- Created: 2026-02-01T05:48:26Z
- Status: completed (awaiting acceptance)
- Complexity: high
- Steps: 9
- MCP Sync: yes

---

## Goal
Align the chat product to docs/main.md requirements: four modes, visible process events via AI SDK data parts, report mode UI, streaming, persistence (runs/events/reports), and quota enforcement, while unifying the architecture (no patchwork).

---

## Background

### Current state
- Two chat endpoints exist: `src/app/api/agents/chat/route.ts` (agent.stream + toAISdkStream) and `src/app/api/mastra/chat/route.ts` (handleChatStream + DB persistence).
- Consensus and research workflows exist and already emit workflow events via `createEvent`.
- Assistant UI data-part renderer exists in `src/components/assistant-ui/data-parts.tsx` with names: stage, progress, tool-call, tool-result, sources, branch-status, step-summary, decision, report, etc.
- UI entry points: `src/app/[locale]/(marketing)/main-page-client.tsx` and `src/app/[locale]/(main)/(protected)/chat/[sessionId]/page.tsx`.

### Gaps vs docs/main.md
- Four-mode selector and routing not fully implemented (missing rigorous analysis, no backend mode routing).
- Process visibility is not consistently streamed from the main chat endpoint.
- Report mode UI (left report viewer + right follow-up chat) not present.
- Runs/events/reports persistence and replay not wired to chat UI for all modes.
- Quota/usage enforcement missing.

### Impact scope (initial)
- API: `src/app/api/agents/chat/route.ts`, `src/app/api/mastra/chat/route.ts`
- Workflows: `src/features/mastra/workflows/*`
- UI: `src/app/[locale]/(marketing)/main-page-client.tsx`, `src/app/[locale]/(main)/(protected)/chat/[sessionId]/page.tsx`, `src/components/assistant-ui/*`
- DB: `src/lib/db/schema.ts`, `src/lib/db/migrations/*`

---

## Implementation plan

### Step 1: Persistence foundation for runs/events/reports/usage (backend)
- Status: completed (via sub-plan sub-001)
- Goal: ensure schemas and data access for runs, events, reports, and usage counters exist and are ready for all modes.
- Files:
  - `src/lib/db/schema.ts` (extend/add tables)
  - `src/lib/db/migrations/*` (generate migration)
  - `src/features/mastra/workflows/persistence.ts` (reuse/extend for run + step updates)
- Actions:
  1. Define tables for runs, events, reports, branch reports, usage counters/logs (per docs/main.md).
  2. Add append-only events with seq/createdAt and TTL strategy.
  3. Add indexes for session/run lookups.
- Verification:
  - `pnpm db:generate` creates migration.
  - `pnpm db:migrate` applies successfully in dev.

### Step 2: Shared chat contract (modes + data parts + report schema)
- Status: completed
- Executed: 2026-02-01 14:11
- AI Score: 85/100
- Goal: define a single source of truth for mode config, event names, and report payload shape.
- Files:
  - new `src/features/agents/lib/chat-contract.ts`
  - update `src/components/assistant-ui/data-parts.tsx` if required for new data-part names
- Actions:
  1. Define Mode IDs: instant, rigorous, consensus, research (map to UI labels).
  2. Define data-part names and payload schemas (stage, round, tool-call, tool-result, sources, branch-status, step-summary, decision, report).
  3. Define report metadata schema (reportId, type, summary, sections, citations).
- Verification:
  - Type-check in TS; no unused or duplicate definitions.

### Step 3: Unify chat endpoint for QA + rigorous analysis (backend)
- Status: completed (via sub-plan sub-002)
- Executed: 2026-02-01 14:20
- AI Score: 84/100
- Goal: route QA and rigorous analysis through a single streaming pipeline that completes tool calls and final text.
- Files:
  - `src/app/api/agents/chat/route.ts`
  - (optionally) `src/app/api/mastra/chat/route.ts` (deprecate or wrap)
  - `src/features/mastra/agents/qa-agent.ts`
- Actions:
  1. Route by mode in request body; default to instant QA.
  2. Use Mastra streaming handler that supports tool execution + continued generation.
  3. Emit data parts for stage/tool-call/tool-result/sources/step-summary.
  4. Persist events and message summaries in DB.
- Verification:
  - From `/zh` -> send prompt -> receive tool-call + final text in same response.
  - Stored events can be fetched and replayed.

### Step 4: Consensus workflow wiring (backend)
- Status: completed (via sub-plan sub-003)
- Executed: 2026-02-01 14:35
- AI Score: 87/100
- Goal: connect consensus mode to existing workflow with event streaming and report persistence.
- Files:
  - `src/features/mastra/workflows/consensus-workflow.ts`
  - `src/app/api/agents/chat/route.ts` (mode routing)
- Actions:
  1. Create run + step records before workflow start.
  2. Wire workflow event emitter to AI SDK data parts.
  3. Persist branch reports + consensus report.
- Verification:
  - Consensus mode streams branch status and final report event.

### Step 5: Research workflow wiring (backend)
- Status: completed
- Executed: 2026-02-01 14:41
- AI Score: 87/100
- Goal: connect research mode to workflow with planning/round events and report persistence.
- Files:
  - `src/features/mastra/workflows/research-workflow.ts`
  - `src/app/api/agents/chat/route.ts` (mode routing)
- Actions:
  1. Create run + step records before workflow start.
  2. Emit round/stage/step-summary events; persist findings and report.
- Verification:
  - Research mode streams plan, rounds, and final report event.

### Step 6: Chat UI mode selector + process visibility (frontend)
- Status: completed
- Executed: 2026-02-01 14:47
- AI Score: 86/100
- Goal: expose 4 modes in UI and render streaming data parts.
- Files:
  - `src/app/[locale]/(marketing)/main-page-client.tsx`
  - `src/app/[locale]/(main)/(protected)/chat/[sessionId]/page.tsx`
  - `src/components/assistant-ui/data-parts.tsx`
- Actions:
  1. Replace current 3-mode dropdown with 4-mode selector using shared mode IDs.
  2. Send mode to API; handle errors for unsupported modes.
  3. Ensure Assistant UI renders data parts (stage/tool/sources/branch-status/report).
- Verification:
  - Each mode appears and sends correct mode ID.
  - Data-part cards render during streaming.

### Step 7: Report mode UI + follow-up gating (frontend)
- Status: completed
- Executed: 2026-02-01 14:52
- AI Score: 85/100
- Goal: show report viewer on left, follow-up chat on right; restrict follow-up modes.
- Files:
  - new report viewer components under `src/components/` or `src/features/agents/components/`
  - `src/app/[locale]/(main)/(protected)/chat/[sessionId]/page.tsx`
- Actions:
  1. When data-report arrives, switch to report mode layout.
  2. Follow-up chat injects report summary context only.
  3. Only allow instant/rigorous modes for follow-up.
- Verification:
  - Report mode triggers after consensus/research completion.
  - Follow-up mode restrictions enforced.

### Step 8: Quota enforcement (backend)
- Status: completed
- Executed: 2026-02-01 14:57
- AI Score: 84/100
- Goal: enforce per-mode usage counts and record usage logs.
- Files:
  - `src/lib/db/schema.ts` (usage counters/logs)
  - `src/app/api/agents/chat/route.ts`
- Actions:
  1. Check quota before starting runs; decrement on success.
  2. Implement rollback rules for early failures.
- Verification:
  - Over-limit requests return a clear error and do not start run.

### Step 9: Quota UX + error surfaces (frontend)
- Status: completed
- Executed: 2026-02-01 15:02
- AI Score: 84/100
- Goal: show mode availability and quota errors in UI.
- Files:
  - `src/app/[locale]/(marketing)/main-page-client.tsx`
  - `src/app/[locale]/(main)/(protected)/chat/[sessionId]/page.tsx`
- Actions:
  1. Disable modes that are over quota.
  2. Surface quota errors in chat thread.
- Verification:
  - UI reflects quota state and blocks submission when needed.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Event stream volume bloats DB | Medium | High | Throttle/aggregate events; TTL for events |
| Mode routing breaks existing QA chat | Medium | Medium | Backward-compatible defaults and fallbacks |
| Workflow timeouts on long runs | Medium | High | Run status tracking + reconnect/replay |

---

## Acceptance criteria
- Four modes available in UI with correct backend routing.
- QA/rigorous returns final answer after tool calls in a single stream.
- Consensus and research modes stream process events and end with report mode UI.
- Runs/events/reports persisted and replayable.
- Quota enforcement works and is visible to users.

---

## Execution log

| Time | Action | Result |
|------|--------|--------|
| 2026-02-01 13:59 | Step 1 started → sub-plan sub-001 created | in progress |
| 2026-02-01 14:09 | Step 1 completed via sub-plan sub-001 | 85/100 |
| 2026-02-01 14:11 | Step 2 completed | 85/100 |
| 2026-02-01 14:11 | Step 3 started → sub-plan sub-002 created | in progress |
| 2026-02-01 14:20 | Step 3 completed via sub-plan sub-002 | 84/100 |
| 2026-02-01 14:21 | Step 4 started → sub-plan sub-003 created | in progress |
| 2026-02-01 14:35 | Step 4 completed via sub-plan sub-003 | 87/100 |
| 2026-02-01 14:41 | Step 5 completed | 87/100 |
| 2026-02-01 14:47 | Step 6 completed | 86/100 |
| 2026-02-01 14:52 | Step 7 completed | 85/100 |
| 2026-02-01 14:57 | Step 8 completed | 84/100 |
| 2026-02-01 15:02 | Step 9 completed | 84/100 |

---

## Approval
- [ ] I reviewed and approve this plan

Approve to execute: `/do-plan`
