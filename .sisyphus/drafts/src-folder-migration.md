# Draft: Move Root Folders Into `src/`

## Requirements (confirmed)
- Goal: move current root-level folders `app/`, `features/`, `lib/`, `components/`, `messages/` into `src/` to reduce root clutter.
- Must be low-risk with minimal churn and clear checkpoints.
- Must keep imports working (TypeScript strict, Next.js App Router).
- Must call out Next.js gotchas specifically around `src/app`.
- Deliverable: step-by-step migration plan with `git mv` commands, required config changes (tsconfig and next-intl), verification checklist, rollback plan.
- Planning only (no code changes executed in this session).

## Working Assumptions (to validate)
- Project already uses `@/` path alias (common in Next.js) but current base is unknown (repo root vs `src/`).
- next-intl is configured somewhere in-repo (likely `middleware.ts` + a config file for message loading).

## Open Questions
- Do you want to move `messages/` into `src/messages/`, or keep it at repo root while moving only code? (This affects next-intl config + JSON import paths.)
- What import styles are in use today?
  - alias imports like `@/lib/...`
  - absolute imports like `lib/...` or `components/...`
  - mostly relative imports like `../../lib/...`

## Scope Boundaries
- INCLUDE: folder moves via `git mv`, tsconfig path/baseUrl adjustments, next-intl config adjustments, verification + rollback steps.
- EXCLUDE: refactoring import styles beyond what is required to keep the build working (unless you explicitly want an alias cleanup pass).
