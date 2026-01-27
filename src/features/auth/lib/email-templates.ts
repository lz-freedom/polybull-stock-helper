import enMessages from '../../../messages/en.json';
import jaMessages from '../../../messages/ja.json';
import zhMessages from '../../../messages/zh.json';

const DEFAULT_LOCALE = 'en' as const;
type SupportedLocale = typeof DEFAULT_LOCALE | 'zh' | 'ja';

const MESSAGES_BY_LOCALE: Record<SupportedLocale, Record<string, unknown>> = {
    en: enMessages,
    zh: zhMessages,
    ja: jaMessages,
};

function isSupportedLocale(value: string): value is SupportedLocale {
    return value === 'en' || value === 'zh' || value === 'ja';
}

function getNestedString(
    obj: Record<string, unknown>,
    path: string,
): string | null {
    const parts = path.split('.');
    let cur: unknown = obj;
    for (const part of parts) {
        if (!cur || typeof cur !== 'object') return null;
        cur = (cur as Record<string, unknown>)[part];
    }
    return typeof cur === 'string' ? cur : null;
}

function t(locale: SupportedLocale, key: string): string {
    const msg = MESSAGES_BY_LOCALE[locale];
    const fallback = MESSAGES_BY_LOCALE[DEFAULT_LOCALE];
    return (
        getNestedString(msg, key) ??
        getNestedString(fallback, key) ??
        key
    );
}

function escapeHtml(input: string): string {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function safeLinkText(url: string): string {
    // Email clients sometimes make plain hostnames clickable. Keep the full URL explicit.
    return escapeHtml(url);
}

function renderHeaderBannerSvg(): string {
    // NOTE: SVG support varies across email clients (esp. Outlook).
    // We provide an Outlook-safe fallback block via conditional comments.
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="600" height="160" role="img" aria-label="iVibeFinance" style="display:block;width:100%;max-width:600px;height:auto;">
  <defs>
    <linearGradient id="ivf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="50%" stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
    <linearGradient id="ivf-wave1" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
    <linearGradient id="ivf-wave2" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
    <filter id="ivf-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="600" height="160" fill="#0B0F14"/>
  <rect x="0" y="0" width="600" height="160" fill="url(#ivf-grad)" opacity="0.10"/>

  <circle cx="410" cy="58" r="22" fill="#8B5CF6" opacity="0.50" filter="url(#ivf-glow)"/>
  <circle cx="470" cy="92" r="16" fill="#EC4899" opacity="0.45" filter="url(#ivf-glow)"/>
  <circle cx="530" cy="58" r="12" fill="#F97316" opacity="0.40" filter="url(#ivf-glow)"/>
  <circle cx="558" cy="104" r="6" fill="#F97316" opacity="0.35"/>

  <g transform="translate(34 46)">
    <circle cx="34" cy="34" r="34" fill="#0F172A"/>
    <path d="M13 24 Q23 16, 34 24 T55 24" stroke="url(#ivf-wave1)" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.95"/>
    <path d="M13 34 Q23 26, 34 34 T55 34" stroke="url(#ivf-grad)" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M13 44 Q23 36, 34 44 T55 44" stroke="url(#ivf-wave2)" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.95"/>
    <circle cx="55" cy="34" r="3" fill="#F97316" opacity="0.8"/>
  </g>

  <text x="124" y="78" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="26" font-weight="700">iVibeFinance</text>
  <text x="124" y="104" fill="#C9CCCF" font-family="Arial, sans-serif" font-size="12" font-weight="400" letter-spacing="0.4">Smart stock insights, powered by AI</text>

  <text x="462" y="56" fill="#C9CCCF" font-family="Arial, sans-serif" font-size="12" font-weight="600">build</text>
  <text x="462" y="76" fill="#C9CCCF" font-family="Arial, sans-serif" font-size="12" font-weight="600">with</text>
  <text x="462" y="96" fill="#C9CCCF" font-family="Arial, sans-serif" font-size="12" font-weight="600">intelligence</text>
</svg>`;

    const outlookFallback = `
<!--[if mso]>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color:#0B0F14;padding:24px 24px;">
      <div style="font-family: Arial, sans-serif; color:#ffffff; font-size:20px; font-weight:700;">iVibeFinance</div>
      <div style="font-family: Arial, sans-serif; color:#C9CCCF; font-size:12px; margin-top:6px;">Smart stock insights, powered by AI</div>
    </td>
  </tr>
</table>
<![endif]-->`;

    return `${outlookFallback}
<!--[if !mso]><!-->
${svg}
<!--<![endif]-->`;
}

function getBaseUrl(): string | null {
    const base = process.env.BASE_URL;
    if (!base) return null;
    try {
        // Validate URL format.
        // eslint-disable-next-line no-new
        new URL(base);
        return base.replace(/\/$/, '');
    } catch {
        return null;
    }
}

function renderFooterHtml(locale: SupportedLocale): string {
    const followTitle = t(locale, 'email.footer.followTitle');
    const updatesLine = t(locale, 'email.footer.updatesLine');
    const unsubscribeLabel = t(locale, 'email.footer.unsubscribe');

    const discordUrl = process.env.SOCIAL_DISCORD_URL;
    const youtubeUrl = process.env.SOCIAL_YOUTUBE_URL;
    const xUrl = process.env.SOCIAL_X_URL;
    const manageUrl = (() => {
        const baseUrl = getBaseUrl();
        if (!baseUrl) return null;
        return `${baseUrl}/settings/notifications`;
    })();

    const links: Array<{ label: string; href: string }> = [];
    if (discordUrl) links.push({ label: 'Discord', href: discordUrl });
    if (youtubeUrl) links.push({ label: 'YouTube', href: youtubeUrl });
    if (xUrl) links.push({ label: 'X/Twitter', href: xUrl });

    const linksHtml =
        links.length > 0
            ? `<div style="text-align:center;margin: 10px 0;">
  ${links
      .map(
          (l) =>
              `<a href="${escapeHtml(l.href)}" target="_blank" style="color:#333333;font-size:13px;font-weight:normal;font-family:Arial, sans-serif;line-height:22px;text-decoration:none;margin:0 8px;">${escapeHtml(l.label)}</a>`,
      )
      .join('')}
</div>`
            : '';

    const unsubscribeHtml = manageUrl
        ? `<a href="${escapeHtml(manageUrl)}" target="_blank" style="text-decoration:underline;color:inherit;">${escapeHtml(unsubscribeLabel)}</a>`
        : escapeHtml(unsubscribeLabel);

    return `
<div style="background:#fafafa;background-color:#fafafa;padding:10px 0;">
  <div style="border-top:solid 1px #C9CCCF;font-size:1px;line-height:1px;width:100%;">&nbsp;</div>
  <div style="padding:18px 25px 14px 25px;text-align:center;font-family:Arial, sans-serif;color:#333333;font-size:14px;line-height:1.7;">
    ${escapeHtml(followTitle)}
  </div>
  ${linksHtml}
  <div style="padding:10px 0;">
    <div style="border-top:solid 1px #C9CCCF;font-size:1px;line-height:1px;width:100%;">&nbsp;</div>
  </div>
  <div style="padding:12px 25px 18px 25px;font-family:Arial, sans-serif;font-size:14px;line-height:1.7;color:#9b9b9b;">
    ${escapeHtml(updatesLine).replace(
        '{unsubscribe}',
        unsubscribeHtml,
    )}
  </div>
</div>`;
}

export function inferLocaleFromVerificationUrl(url: string): SupportedLocale {
    try {
        const verificationUrl = new URL(url);
        const callbackUrlRaw = verificationUrl.searchParams.get('callbackUrl');
        if (callbackUrlRaw) {
            const callbackUrl = new URL(callbackUrlRaw);
            const firstSeg = callbackUrl.pathname.split('/').filter(Boolean)[0];
            if (firstSeg && isSupportedLocale(firstSeg)) return firstSeg;
        }
    } catch {
        // ignore
    }
    return DEFAULT_LOCALE;
}

function buildEmailDocument(params: {
    preheader: string;
    contentHtml: string;
    footerHtml: string;
}): string {
    const headerHtml = renderHeaderBannerSvg();
    return `<!doctype html>
<html lang="en" dir="auto" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG/>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
      body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; display: block; }
      a { color: inherit; }
    </style>
  </head>
  <body style="word-spacing: normal; background-color: #f3f3f3;">
    <div style="display:none;font-size:1px;color:#f3f3f3;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
      ${escapeHtml(params.preheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f3f3;">
      <tr>
        <td align="center" style="padding: 0;">
          <!--[if mso]>
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
          <![endif]-->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;">
            <tr>
              <td style="padding:0;">
                ${headerHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:#fafafa;padding:10px 25px;">
                <div style="font-family: Arial, sans-serif; font-size: 14px; font-style: normal; font-weight: 400; line-height: 1.7; text-align: left; color: #000000;">
                  ${params.contentHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                ${params.footerHtml}
              </td>
            </tr>
          </table>
          <!--[if mso]>
              </td>
            </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderMagicLinkEmail(params: {
    url: string;
}): { subject: string; html: string; text: string } {
    const locale = inferLocaleFromVerificationUrl(params.url);
    const subject = t(locale, 'email.magicLink.subject');

    const title = t(locale, 'email.magicLink.title');
    const body = t(locale, 'email.magicLink.body');
    const buttonText = t(locale, 'email.magicLink.button');
    const footer = t(locale, 'email.magicLink.footer');
    const fallback = t(locale, 'email.magicLink.fallback');

    const escapedUrl = escapeHtml(params.url);
    const contentHtml = `
<p style="margin: 13px 0;"><strong>${escapeHtml(title)}</strong></p>
<p style="margin: 13px 0;">${escapeHtml(body)}</p>
<div style="text-align:center;margin: 18px 0;">
  <a href="${escapedUrl}" target="_blank" style="display:inline-block;background:#12c666;color:#ffffff;font-family:Arial, sans-serif;font-size:13px;font-weight:800;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:3px;">
    ${escapeHtml(buttonText)}
  </a>
</div>
<p style="margin: 13px 0; font-size: 12px; color: #333333;">${escapeHtml(fallback)}</p>
<p style="margin: 13px 0; word-break: break-all; font-size: 12px; color: #333333;">${safeLinkText(params.url)}</p>
`;

    const footerHtml = renderFooterHtml(locale);

    const html = buildEmailDocument({
        preheader: title,
        contentHtml,
        footerHtml,
    });

    const text = [
        title,
        '',
        body,
        '',
        `${buttonText}: ${params.url}`,
        '',
        footer,
        '',
    ].join('\n');

    return { subject, html, text };
}
