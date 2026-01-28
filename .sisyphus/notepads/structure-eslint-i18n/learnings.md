### 2026-01-25
- 倉庫目前僅提供 Next.js 15 App Router 範本，尚無 facts_snapshot 與 agent 模塊，需要完全新建資料/LLM層。

- Verified route structure: locale-aware pages live under `src/app/[locale]`, with `chat` at `src/app/[locale]/(dashboard)/chat/page.tsx` and locale root at `src/app/[locale]/(marketing)/page.tsx`.
- `src/i18n/routing.ts` includes `zh` locale and uses `localePrefix: 'as-needed'`.
- `src/proxy.ts` matcher excludes only api/_next/_vercel/asset files; it would handle `/zh` and `/zh/chat` if invoked.

### 2026-01-28
- Agent triggers live in `src/features/agents/actions.ts`: `startConsensusRun`, `startResearchRun`, `createNewChatSession`, `sendChatMessageAction`, `refreshChatData` with required inputs (stockSymbol/exchangeAcronym/query).
- Data fetching uses `getOrFetchSnapshot` in `src/features/agents/lib/services/facts-snapshot-service.ts` (Fast Finance API) with helpers `extractStockInfo`, `extractLatestFinancials`, `extractRecentNews`.
- QA chat context in `src/features/agents/lib/graphs/qa.ts` and research/consensus graphs build prompts from snapshot-derived data.
- Fast Finance snapshot 抽取器已更新為優先使用小寫新 key，並保留舊 key fallback 以支援舊 DB 資料結構。
