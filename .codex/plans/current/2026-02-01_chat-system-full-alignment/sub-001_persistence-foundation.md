# Sub-Plan: Persistence foundation (runs/events/reports/usage)

## Metadata
- Sub-Plan ID: sub-001
- Plan Type: Sub
- Parent Plan: ../2026-02-01_chat-system-full-alignment.md
- Linked Step: Step 1 - Persistence foundation for runs/events/reports/usage
- Created: 2026-02-01T05:59:26Z
- Status: completed
- Created Because: Step 1 touches 3+ core files and introduces new schemas/migrations (high risk).

---

## Problem analysis

### Background
We need DB persistence for runs/events/reports/usage to support replay, reporting, and quota enforcement.

### Complexity drivers
- Schema additions across multiple tables.
- Migration and persistence helpers must stay consistent with existing agent_runs/reportSections patterns.

---

## Execution steps

### Step 1: Extend schema and relations
- Status: completed
- Executed: 2026-02-01 14:07
- AI Score: 85/100
- Goal: add or extend tables for runs, events, reports, branch reports, usage counters/logs.
- Files:
  - `src/lib/db/schema.ts`
- Actions:
  1. Audit existing tables (agent_runs, reportSections, reports) and design delta.
  2. Add required tables/relations and indexes.
- Verification:
  - Typecheck passes for schema exports.

### Step 2: Create migration
- Status: completed
- Executed: 2026-02-01 14:08
- AI Score: 85/100
- Goal: generate and validate Drizzle migration.
- Files:
  - `src/lib/db/migrations/*`
- Actions:
  1. Run `pnpm db:generate`.
  2. Review migration for correctness.
- Verification:
  - Migration exists and matches intended schema changes.

### Step 3: Update persistence helpers
- Status: completed
- Executed: 2026-02-01 14:09
- AI Score: 85/100
- Goal: ensure runs/events/reports can be written consistently.
- Files:
  - `src/features/mastra/workflows/persistence.ts`
- Actions:
  1. Add helpers for new tables or extend existing helpers.
  2. Ensure workflows can write run status and event rows.
- Verification:
  - Existing workflows compile with updated persistence helpers.

---

## Execution log

| Time | Action | Result |
|------|--------|--------|
| 2026-02-01 14:07 | Step 1 completed | 85/100 |
| 2026-02-01 14:08 | Step 2 completed | 85/100 |
| 2026-02-01 14:09 | Step 3 completed | 85/100 |
