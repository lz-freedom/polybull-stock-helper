# Source Layout Restructuring Tasks

## Task 1: Prepare Destination Directories [x]
Files: src/components/ui, src/features, src/lib, src/i18n, src/messages
**Steps:**
1. `mkdir -p src/components/ui`
2. `mkdir -p src/features`
3. `mkdir -p src/lib`
4. `mkdir -p src/i18n`
5. `mkdir -p src/messages`
**Verify:** `test -d src/components/ui && test -d src/features && test -d src/lib && test -d src/i18n && test -d src/messages`
**Acceptance Criteria:** All target directories exist inside `src/`.

## Task 2: Move Code [x]
Files: features/, lib/, i18n/, messages/, proxy.ts
**Steps:**
1. `git mv features/* src/features/` && `rmdir features`
2. `git mv lib/* src/lib/` && `rmdir lib`
3. `git mv i18n/* src/i18n/` && `rmdir i18n`
4. `git mv messages/* src/messages/` && `rmdir messages`
5. `git mv proxy.ts src/`
6. `if [ -d "src/features/shared/components/ui" ]; then git mv src/features/shared/components/ui/* src/components/ui/; fi`
**Verify:** `test ! -d features && test ! -d lib && test ! -f proxy.ts && ls src/proxy.ts`
**Acceptance Criteria:** Original root directories and proxy.ts are moved to `src/`.

## Task 3: Update Configs [x]
Files: tsconfig.json, components.json, next.config.ts, drizzle.config.ts, package.json
**Steps:**
1. Edit `tsconfig.json`:
   - Set `"baseUrl": "."` (ensure)
   - Update paths: `"@/*": ["./src/*"]`
   - Add path: `"@features/*": ["./src/features/*"]`
2. Edit `components.json`:
   - Ensure aliases point to `@/components` and `@/components/ui`.
3. Edit `next.config.ts`:
   - Replace `./i18n/request.ts` with `./src/i18n/request.ts`.
4. Edit `drizzle.config.ts`:
   - Replace `./lib/db/schema.ts` with `./src/lib/db/schema.ts`.
   - Replace `./lib/db/migrations` with `./src/lib/db/migrations`.
5. Edit `package.json`:
   - Replace `lib/db/setup.ts` with `src/lib/db/setup.ts`.
   - Replace `lib/db/seed.ts` with `src/lib/db/seed.ts`.
**Verify:**
1. `grep '"@/\*": \["\./src/\*"\]' tsconfig.json`
2. `grep 'src/i18n/request.ts' next.config.ts`
3. `grep 'src/lib/db/schema.ts' drizzle.config.ts`
4. `grep 'src/lib/db/setup.ts' package.json`

## Task 4: Fix Imports [x]
Files: src/**/*.ts, src/**/*.tsx
**Steps:**
1. Use `fastmod` or `sed` to replace imports:
   - `from "@/lib` -> (no change, check alias)
   - `from "../lib` -> `from "@/lib`
   - `from "../features` -> `from "@features`
2. Update shared UI imports:
   - Find: `from "@features/shared/components/ui`
   - Replace with: `from "@/components/ui`
3. Verify Asset Imports:
   - Ensure `@/assets` works (should be covered by `tsconfig` `@/*` -> `src/*`).
**Verify:**
1. `grep -r "@features/shared/components/ui" src || echo "Clean"`
2. `grep -r "@features" src | head -n 5` (should show valid feature imports)

## Task 5: Verify & Cleanup [x]
**Steps:**
1. Run `pnpm build` to ensure integrity.
2. Run structure invariant check (find in root).
**Verify:** All checks pass.
**Acceptance Criteria:** Project is fully functional in the new layout.
