# Draft: Replace Email With Reusable Template Layout

## Requirements (confirmed)
- Replace an existing email with a new template layout based on provided `.eml` reference: `[TRAE] TRAE Fellow 招募中！主辦台灣技術聚會，驅動 AI 程式開發創新！.eml`.
- Build a reusable email template layout (header/body/footer styles) and migrate existing email content to use it.
- Preserve existing sending pipeline and localization patterns.
- Next.js 15 app; strict TypeScript; shadcn/ui present; emails may be raw HTML or React templates.

## Technical Decisions (pending)
- Template format: React email components vs raw HTML (default TBD after discovery).
- Styling strategy: inline CSS vs embedded styles vs utility-to-inline build (depends on current pipeline).
- Localization approach: next-intl server translations vs precompiled strings (depends on existing patterns).

## Research Findings (pending)
- (Waiting on librarian agent)

## Open Questions
- Which email(s) are being replaced (name/path/trigger) and what provider sends them?
- Which locales must be supported and how are translations sourced today?
- Any constraints on assets (logo hosting), tracking pixels, unsubscribe, or compliance?
- Preview/testing expectations: local preview, staging send, seed list, snapshot diffs?

## Scope Boundaries
- INCLUDE: reusable layout + migrating target email(s) + verification plan.
- EXCLUDE (assumed for now): broad redesign of all emails, changing provider/sending infra, new deliverability tooling.
