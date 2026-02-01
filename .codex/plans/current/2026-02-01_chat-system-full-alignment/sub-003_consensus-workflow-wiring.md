# Sub-Plan: Consensus workflow wiring

## Metadata
- Sub-Plan ID: sub-003
- Plan Type: Sub
- Parent Plan: ../2026-02-01_chat-system-full-alignment.md
- Linked Step: Step 4 - Consensus workflow wiring (backend)
- Created: 2026-02-01T06:21:00Z
- Status: completed
- Created Because: Step 4 touches workflow execution, event streaming, and persistence (high risk).

---

## Problem analysis

### Background
Consensus workflow exists but is not wired to the unified chat endpoint with streaming events and report persistence for end users.

### Complexity drivers
- Requires run/step creation and event emission integration.
- Must persist branch reports and consensus report while streaming status.

---

## Execution steps

### Step 1: Prepare run + step creation for consensus
- Status: completed
- Executed: 2026-02-01 14:35
- AI Score: 86/100
- Goal: ensure run/step records exist before workflow execution.
- Files:
  - `src/app/api/agents/chat/route.ts`
  - `src/features/mastra/workflows/consensus-workflow.ts`
- Actions:
  1. Confirm required inputs (runDbId, steps ids) and create records.
- Verification:
  - Run/step rows created with pending status.

### Step 2: Wire event streaming + report persistence
- Status: completed
- Executed: 2026-02-01 14:35
- AI Score: 87/100
- Goal: stream workflow events as AI SDK data parts and persist reports.
- Files:
  - `src/app/api/agents/chat/route.ts`
  - `src/features/mastra/workflows/consensus-workflow.ts`
- Actions:
  1. Attach workflow emitter to stream data parts (stage/branch-status/report).
  2. Ensure reports + sections persisted.
- Verification:
  - Consensus mode returns branch-status and report events.

---

## Execution log

| Time | Action | Result |
|------|--------|--------|
| 2026-02-01 14:21 | Step 1 started | in progress |
| 2026-02-01 14:35 | Step 1 completed | 86/100 |
| 2026-02-01 14:35 | Step 2 started | in progress |
| 2026-02-01 14:35 | Step 2 completed | 87/100 |
