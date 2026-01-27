# Design: Source Layout Restructuring

## Final Directory Structure
- `src/app` (existing)
- `src/features` (from `features`)
- `src/lib` (from `lib`)
- `src/i18n` (from `i18n`)
- `src/messages` (from `messages`)
- `src/components/ui` (target for shadcn)
- `src/proxy.ts` (from `proxy.ts`)

## Configuration Changes
### tsconfig.json
- Update paths to strict `src` mapping (`@/*` -> `./src/*`).
- Map `@features/*` to `./src/features/*`.
- Remove `./*` from `@/*` if possible or order `src` first.

### components.json
- Update aliases to use `@/components` and `@/lib/utils`.

### next.config.ts
- Update `createNextIntlPlugin` path to `./src/i18n/request.ts`.

### drizzle.config.ts
- Update `schema` to `./src/lib/db/schema.ts`.
- Update `out` to `./src/lib/db/migrations`.

### package.json
- Update scripts (`db:setup`, `db:seed`) to use `src/lib/db/...` paths.

### proxy.ts
- Move `proxy.ts` to `src/proxy.ts`.

## PBT Properties & Invariants

### 1. Structure Invariant
**Invariant:** "All source code resides in `src/` (except config files)."
**Falsification Strategy:**
- Run `find . -maxdepth 2 -not -path '*/.*' -not -path './node_modules*' -not -path './src*' -not -path './env*' -not -path './openspec*' -type d`
- If any directory (features, lib, i18n, components) is found in root, property is falsified.

### 2. Build Integrity Invariant
**Invariant:** "The project builds successfully with `pnpm build`."
**Falsification Strategy:**
- Run `pnpm build`.
- If exit code != 0, property is falsified.

### 3. Config Consistency Invariant
**Invariant:** "All config files point to `src/` paths."
**Falsification Strategy:**
- grep `tsconfig.json` for paths NOT starting with `./src` or `@/`.
- grep `components.json` for aliases NOT starting with `@/`.
- grep `next.config.ts` for i18n paths NOT starting with `./src`.
- grep `drizzle.config.ts` for schema/out paths NOT starting with `./src`.
- If matches found (excluding `node_modules` or dist), property is falsified.
