# Draft: Homepage Chat Rework

## Requirements (confirmed)
- Keep chat experience on homepage (no separate design; match existing marketing style).
- Stream AI output and render JSON-based cards (e.g., fundamentals: PE, returns) during streaming.
- Fix IME Enter bug (composition confirm should not send message).
- Agent selection must affect backend path and behavior.
- Parse user input to extract stock symbol + exchange via model, then fetch stock data via API.
- First send should navigate to `/chat/{chat_id}` while preserving same layout; history sessions open by link.
- `/chat/{chat_id}` requires auth; public share opens a separate page (like https://asksurf.ai/share/... ).
- Sidebar should list history sessions; hide history title when empty.
- Current API payload is wrong (stockSymbol/exchangeAcronym guessed, not extracted).
- Extraction must be model-driven; do not guess stockSymbol/exchangeAcronym.
- Use json-render to stream structured UI beyond chat text (score cards, composite score, model score list, analyst panel), not just plain messages.
- Consensus + Research outputs should both support structured UI streaming; QA may also emit charts/metric tables inline.
- UI should support chart-like and icon-rich sections in-stream (not limited to text), similar to the reference screenshot.
- Streamed report sections should support: table blocks, inline charts, KPI rows, section TOC, and carded summaries to feel like a research report (not a chat transcript).
- Must support both dark and light modes, and must NOT change existing theme colors. Use existing tokens/variables only.

## Technical Decisions
- TBD: Use existing components/utilities for JSON rendering and report cards (need discovery).
- TBD: Use existing agent server actions for consensus/research/qa (need discovery).
- Proposed JSON card layout for homepage stream:
  - Card 1 (Overview): symbol, exchange, lastPrice, marketCap, currency, lastUpdated
  - Card 2 (Valuation): pe, forwardPe, pb, ps, peg
  - Card 3 (Returns): return_1d, return_1w, return_1m, return_3m, return_1y, return_3y, return_5y
  - Card 4 (Fundamentals): revenueGrowthYoy, epsGrowthYoy, grossMargin, operatingMargin, freeCashFlowMargin
- Proposed structured streaming payloads for json-render:
  - CompositeScorePanel: overallScore (0-100), stance (bullish/bearish/neutral), perModelScores[], dimensionScores[], highlights[], risks[]
  - AnalystPanel: activeModel, modelProfiles[], modelScoreBreakdown[], summaryMarkdown, keyTakeaways[], majorRisks[]
- Default QA strategy: manual verification (no test infrastructure).

## Research Findings
- `@json-render/*` is installed but not used in code. Existing report UI manually maps JSON to cards in `src/features/agents/components/research-report.tsx` and `src/features/agents/components/consensus-report.tsx`.
- `ReportViewer` in `src/features/agents/components/report-viewer.tsx` streams structured JSON via `useObject` and renders report sections.
- Session history sidebar is implemented directly in `src/app/[locale]/(dashboard)/chat/page.tsx`.
- Data pipeline: `src/features/agents/lib/services/facts-snapshot-service.ts` provides `getOrFetchSnapshot` (Fast Finance API + DB cache).
- Live Fast Finance response (AAPL) structure is lower-case and different from current code expectations:
  - `data.info`, `data.balance_yearly_yefinancials`, `data.balance_quarterly_yefinancials`, `data.income_yearly_yefinancials`, `data.income_quarterly_yefinancials`, `data.cashflow_yearly_yefinancials`, `data.cashflow_quarterly_yefinancials`, `data.news`, `data.splits`, `data.dividends`, `data.name_and_new_translations`.
  - `data.info` contains investor-relevant fields (confirmed): `currentPrice`, `regularMarketPrice`, `previousClose`, `open`, `dayLow`, `dayHigh`, `fiftyTwoWeekLow`, `fiftyTwoWeekHigh`, `marketCap`, `beta`, `trailingPE`, `forwardPE`, `priceToBook`, `priceToSalesTrailing12Months`, `enterpriseToRevenue`, `enterpriseToEbitda`, `dividendYield`, `fiveYearAvgDividendYield`, `payoutRatio`, `returnOnAssets`, `returnOnEquity`, `grossMargins`, `operatingMargins`, `profitMargins`, `totalRevenue`, `revenueGrowth`, `earningsGrowth`, `freeCashflow`, `totalCash`, `totalDebt`, `debtToEquity`, `currency`, `financialCurrency`, `shortName`, `longName`, `symbol`, `exchange`, `quoteType`, `fullTimeEmployees`, `sector`, `industry`.
  - Financial arrays include fields such as `freeCashFlow`, `capitalExpenditure`, `totalDebt`, `stockholdersEquity`, `basicEPS`, `dilutedEPS`, etc. (from *_yefinancials arrays).
- Exchanges mapping: `src/features/agents/lib/exchanges.ts`.
- Agent triggers: `startConsensusRun` / `startResearchRun` in `src/features/agents/actions.ts`.
- Next.js 16+ uses `proxy.ts` as middleware entry point; `middleware.ts` conflicts.
- Existing streaming/UI patterns available:
  - `ReportViewer` uses `experimental_useObject` for structured JSON streaming.
  - `MastraChat` uses `useChat` for text streaming; `EmbeddedQAChat` uses manual SSE.
  - `WorkflowStream` uses custom event stream with progress/stage/tool-call events.
- No automated test infrastructure in repo (no test scripts/configs).

## Open Questions
- Desired JSON schema/fields for fundamentals + card layout hierarchy.
- Whether `/chat/{chat_id}` should require auth (proxy redirect) or be shareable/public.
- Send key behavior: Enter vs Ctrl/Cmd+Enter to avoid IME confirm bug.

## Scope Boundaries
- INCLUDE: Homepage chat streaming UI, agent selection wiring, stock extraction + data fetch, session routing + sidebar history.
- EXCLUDE: Redesigning `/chat` visuals beyond matching homepage layout.
