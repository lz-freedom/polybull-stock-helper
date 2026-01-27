# Draft: Email Template Update (Magic Link)

## Requirements (confirmed)
- Update Magic Link email template rendered by `features/auth/lib/email-templates.ts`.
- Replace the current header image with a project-branded banner derived from reference email: `tmp/[TRAE] Celebrate Year 1 - Bonus Inside!.eml`.
- Add a footer block (new content beyond current single-line footer).
- Add i18n keys for any new copy in `messages/en.json`, `messages/zh.json`, `messages/ja.json`.
- Do not store template/preview code or generated preview artifacts under `tmp/` (tmp is for temporary reference only).

## Current Implementation (evidence)
- Email template: `features/auth/lib/email-templates.ts`
  - `DEFAULT_HEADER_IMAGE_URL` remote PNG used in `<img ... width="600" style="width:100%;max-width:600px" />`.
  - i18n is done via direct JSON imports (`messages/*.json`) + custom `t()` helper.
  - Locale inferred from `callbackUrl` first path segment in the verification URL.
- Sender hook: `features/auth/lib/config.ts` uses Auth.js/Nodemailer `sendVerificationRequest` and calls `renderMagicLinkEmail({ url })`.

## Reference Email Findings (from decoded .eml)
- Header: a 600px-wide `<img>` at top of email.
- Footer patterns present in reference:
  - Divider line.
  - “Follow us …” block.
  - Social link rows with small icon images.
  - Marketing unsubscribe text (likely not appropriate for a transactional auth email).

## Technical Decisions (proposed, not yet confirmed)
- Banner asset strategy: host assets under `public/` and reference via absolute URL (likely using `BASE_URL`).
- Email-client safety: do NOT rely on inline `<svg>`; require a safe fallback strategy.
- Preview artifacts: write any generated preview HTML to `.sisyphus/evidence/` (not `tmp/`).

## Open Questions
None (footer intent chosen).

## User Decisions (confirmed)
- Footer: include “follow us” + social links/icons (no unsubscribe language).

## Scope Boundaries
- INCLUDE: template HTML/text changes, i18n keys, safe image embedding strategy, tmp hygiene checks.
- EXCLUDE: broader marketing email system refactor (e.g., React Email/MJML pipeline), unless explicitly requested.
