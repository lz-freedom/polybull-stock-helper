### 2026-01-25
- OpenCode glob 工具在本倉庫多次報 ./.agent/skills/ui-ux-pro-max 缺失，暫時需改用 bash ls 查詢。

- `src/proxy.ts` is not referenced anywhere and Next.js does not pick it up by default (no root `middleware.ts`, no custom server config). If locale/auth handling depends on this file, it is currently not running.

### 2026-01-28
- 未找到將使用者輸入文本抽取股票代號/交易所的邏輯；目前僅有 snapshot 內部的 `extractStockInfo`。
- 本次修改無新增問題。
