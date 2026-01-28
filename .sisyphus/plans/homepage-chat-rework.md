# Homepage Chat Rework (Streaming Report UI)

## Context

### Original Request
Rework the homepage chat into a report-like, streamable UI with JSON-rendered components (charts, tables, KPI rows, score panels). Fix agent routing, stock/exchange extraction, input IME bug, session routing, and history sidebar. `/chat/{chat_id}` requires login; public share opens a separate read-only report page with a button back to homepage. Must support light/dark modes without changing theme colors.

### Interview Summary
**Key Discussions**
- Homepage and `/chat/{chat_id}` must share the same report-like layout (not a plain chat transcript).
- Streaming must render structured blocks (TOC, KPI rows, tables, charts, callouts, score panels), not just text.
- Agent selection must determine backend path; model should extract symbol/exchange (no guessing).
- First send navigates to `/chat/{chat_id}` and preserves prompt/history; history list in sidebar and hide header when empty.
- Share page is read-only; no input bar; link like `https://asksurf.ai/share/...`.
- Must keep existing light/dark theme colors; no palette changes.

**Research Findings**
- Streaming patterns exist: `ReportViewer` + `experimental_useObject`, `MastraChat`, `EmbeddedQAChat`, `WorkflowStream`.
- `facts-snapshot-service.ts` currently expects capitalized keys, but live Fast Finance data is lower-case (`info`, `income_yearly_yefinancials`, etc.).
- `data.info` contains real valuation/price/quality metrics (e.g., `trailingPE`, `priceToBook`, `marketCap`, `returnOnEquity`).
- No automated test infrastructure exists; use manual QA.

### Metis Review (Gaps Addressed)
- Auth flow for guest → `/chat/{id}`: plan includes preserving prompt through auth modal and redirect after login.
- Streaming robustness: plan includes timeout + graceful failure and JSON fallback.
- Mobile handling for tables/charts: plan enforces `overflow-x-auto` and responsive chart containers.

---

## Work Objectives

### Core Objective
Deliver a unified, report-style streaming experience on homepage and `/chat/{chat_id}` that renders structured JSON blocks (metrics, tables, charts, scores), routes agent selections correctly, uses real stock data fields, and respects auth + theme constraints.

### Concrete Deliverables
- Report-style UI blocks (TOC, KPI rows, tables, charts, callouts) streamable on homepage and `/chat/{chat_id}`.
- Correct agent routing (QA/Consensus/Research) using model-based symbol/exchange extraction.
- `/chat/{chat_id}` auth-gated; share page read-only with home button.
- Sidebar history list with empty-state behavior.
- IME Enter bug fixed (composition confirm shouldn’t send).

### Definition of Done
- Homepage input triggers report stream; structured blocks appear as they arrive.
- First send navigates to `/chat/{chat_id}` and the report continues streaming there.
- Agent selection changes backend path (QA vs consensus vs research).
- No guessed symbols/exchanges; extraction uses model and real API fields.
- Share page opens read-only report; “Go to Home” button present.
- Light/dark mode preserved using existing tokens only.

### Must Have
- JSON streaming for report blocks and score panels.
- Correct use of real data fields from Fast Finance `data.info` and financial arrays.

### Must NOT Have (Guardrails)
- No theme color modifications (no edits to global theme/tokens).
- No generic “render any JSON” UI; only supported block types.
- No public access to `/chat/{chat_id}` (auth required).

---

## Verification Strategy (Manual)

**Infrastructure**: No tests present → manual verification only.

**Manual QA (Required)**
1. **Homepage Stream**
   - Enter a prompt with a ticker (e.g., “分析 AAPL 未来三年趋势”).
   - Verify: agent selection affects output type; streaming begins within ~2s; blocks (KPI, table, chart, callout) appear progressively.
2. **IME Bug**
   - Use Chinese IME, confirm candidate with Enter; ensure it does **not** send.
3. **Routing**
   - First send navigates to `/chat/{chat_id}` and continues streaming (no reset).
4. **Auth**
   - Logged out: send from homepage triggers auth flow; after login, the prompt continues in `/chat/{chat_id}`.
5. **Share Page**
   - Open share link → read-only report (no input bar), with “Go Home” button.
6. **Theme**
   - Toggle light/dark; verify colors unchanged and contrast preserved.

---

## Task Flow

```
Task 1 → Task 2 → Task 3
                 ↘ Task 4 (parallel)
```

## Parallelization
| Group | Tasks | Reason |
|------|-------|--------|
| A | 3, 4 | UI blocks and routing can progress independently |

---

## TODOs

- [x] 1. Normalize Fast Finance response and extraction paths

  **What to do**:
  - Update snapshot parsing to handle lower-case keys (`data.info`, `*_yefinancials`) and map to the fields used in UI blocks.
  - Ensure stock extraction uses model output only; no guessing fallbacks.

  **Must NOT do**:
  - Do not fabricate metrics not present in the API response.

  **Parallelizable**: NO (foundation for data rendering)

  **References**:
  - `src/features/agents/lib/services/facts-snapshot-service.ts` - current snapshot structure and extractors
  - `src/features/mastra/tools/financial-data.ts` - stock snapshot tool outputs

  **Acceptance Criteria**:
  - Snapshot extraction returns actual `data.info` fields (price, valuation, margins) without guesses.
  - No runtime errors when reading live AAPL snapshot.

- [x] 2. Define structured report block schema for streaming UI

  **What to do**:
  - Define a constrained JSON schema for blocks: `toc`, `kpi-row`, `table`, `chart`, `callout`, `score-panel`.
  - Map Consensus/Research/QA outputs into these blocks (no generic renderer).

  **Must NOT do**:
  - Do not create a universal JSON renderer.

  **Parallelizable**: YES (with Task 3)

  **References**:
  - `src/features/agents/lib/schemas.ts` - Score/Consensus/Research schemas
  - `src/features/agents/components/report-viewer.tsx` - streaming JSON approach
  - `src/features/agents/components/consensus-report.tsx` - score blocks rendering

  **Acceptance Criteria**:
  - Each block type has clear fields and mapping rules.
  - Streaming can render partial block trees without crashes.

- [ ] 3. Unify homepage and `/chat/{chat_id}` layout with report-style streaming UI

  **What to do**:
  - Refactor homepage to render streamed blocks (TOC, KPI rows, tables, charts, callouts) using existing theme tokens.
  - Route first send to `/chat/{chat_id}` while maintaining identical layout and continuing stream.
  - Sidebar history list: hide title when empty; include sessions when present.

  **Must NOT do**:
  - Do not alter theme colors or global styles.

  **Parallelizable**: YES (with Task 2)

  **References**:
  - `src/app/[locale]/(marketing)/main-page-client.tsx` - homepage UI
  - `src/app/[locale]/(dashboard)/chat/page.tsx` - history sidebar patterns
  - `src/features/agents/components/report-viewer.tsx` - streaming report UX

  **Acceptance Criteria**:
  - Report blocks stream on homepage and `/chat/{id}`.
  - History sidebar empty state hides its title.
  - Light/dark modes render correctly without color changes.

- [ ] 4. Agent routing + share page behavior

  **What to do**:
  - Wire agent selection to correct backend path: QA chat vs consensus/research report generation.
  - Ensure auth gating for `/chat/{chat_id}` with prompt preservation across login.
  - Implement share page as read-only report view with “Go to Home” button.

  **Must NOT do**:
  - Do not expose `/chat/{chat_id}` publicly.

  **Parallelizable**: YES (with Task 2)

  **References**:
  - `src/features/agents/actions.ts` - agent actions
  - `src/app/api/agents/chat/route.ts` - chat API
  - `src/proxy.ts` - auth routing

  **Acceptance Criteria**:
  - Agent selection changes output path and UI blocks.
  - Share page is read-only with home link.
  - Auth flow preserves user prompt.

- [ ] 5. IME Enter bug fix

  **What to do**:
  - Ensure Enter-to-send does not trigger while IME composition is active.

  **Parallelizable**: YES (with Tasks 3–4)

  **Acceptance Criteria**:
  - Chinese IME candidate selection does not send.
  - Enter sends only when not composing.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-2 | `feat(chat): add structured report streaming schema` | schema/service files | manual QA | 
| 3-5 | `feat(chat): unify report UI and routing` | homepage/chat/share UI | manual QA |

---

## Success Criteria

### Verification Commands
Manual testing via browser (no automated tests available).

### Final Checklist
- [ ] Streaming report blocks render on homepage and `/chat/{chat_id}`.
- [ ] Agent routing works for QA/Consensus/Research.
- [ ] No guessed symbols/exchanges; model extraction used.
- [ ] Share page read-only + home button.
- [ ] IME Enter bug fixed.
- [ ] Light/dark themes unchanged.
