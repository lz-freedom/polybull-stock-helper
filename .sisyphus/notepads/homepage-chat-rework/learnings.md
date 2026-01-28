# Learnings - Homepage Chat Rework

## Existing Patterns
- **Streaming**: `ReportViewer` uses `experimental_useObject` for structured JSON streaming.
- **Data**: Fast Finance API returns lower-case keys (`info`, `income_yearly_yefinancials`), current code expects Capitalized.
- **UI**: Heavy use of `shadcn/ui` + Tailwind.
- **Types**: `FastFinanceResponse` now includes lower-case API keys to align with live payloads.
