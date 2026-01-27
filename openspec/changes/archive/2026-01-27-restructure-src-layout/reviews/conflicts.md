- id: CONFLICT-001
  type: CONFLICT
  status: RESOLVED
  owner: user
  description: Confirm if 'features/shared/components' should be moved to 'src/components' or kept in 'src/features/shared'. Proposal mentions 'src/components/ui' for shadcn.
  where: Directory Structure
  resolution: User selected to move 'features/shared/components/ui' to 'src/components/ui'.
  verify: test -d src/components/ui && test ! -d src/features/shared/components/ui

- id: CONFLICT-002
  type: CONFLICT
  status: RESOLVED
  owner: coder
  description: Task 3 commands are vague. Needs explicit path updates for config files.
  where: tasks.md
  resolution: Updated tasks.md with precise edit steps.
  verify: grep "src/lib/db" package.json && grep "src/i18n" next.config.ts

- id: CONFLICT-003
  type: CONFLICT
  status: RESOLVED
  owner: coder
  description: Frontend assets need explicit verification and import strategy.
  where: tasks.md
  resolution: Added explicit asset verification and import update steps.
  verify: ls -d src/assets && grep "@/assets" src/components/ui/app-sidebar.tsx
