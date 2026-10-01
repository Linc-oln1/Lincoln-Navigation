// lib/email.ts  (server only)
//
// Transactional email from the app itself, through Resend's HTTP API (the
// same Resend account and verified lincolnnavigation.com domain that
// Supabase uses for sign-in emails). Off until RESEND_API_KEY is set.
//
// Env: RESEND_API_KEY   (re_…)
//      EMAIL_FROM       optional, default "Lincoln Navigation <billing@lincolnnavigation.com>"

import { CONTACT_EMAIL } from "@/lib/legal"
import { bump } from "@/lib/rate-limit"

export const EMAIL_ENABLED = Boolean(process.env.RESEND_API_KEY?.trim())

const FROM = process.env.EMAIL_FROM?.trim() || "Lincoln Navigation <billing@lincolnnavigation.com>"

/** Send one email. Returns false if email is off or Resend refused it. */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return false
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [msg.to],
        reply_to: CONTACT_EMAIL,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) console.error("[email] Resend refused:", res.status, (await res.text().catch(() => "")).slice(0, 300))
    return res.ok
  } catch (error) {
    console.error("[email] could not send:", error)
    return false
  }
}

const ONCE_WINDOW_S = 45 * 86_400

/**
 * Send at most once per `key` (Redis claim, 45 days): webhooks can arrive
 * twice and crons re-run. If sending fails the claim is released and false
 * comes back, so a retry can try again. True when email is off.
 */
export async function sendOnce(key: string, send: () => Promise<boolean>): Promise<boolean> {
  if (!EMAIL_ENABLED) return true
  const claimKey = `email:once:${key}`
  if ((await bump(claimKey, ONCE_WINDOW_S)) > 1) return true
  if (await send()) return true
  await bump(claimKey, ONCE_WINDOW_S, -1)
  return false
}

/** The live site's origin, for links and images in emails. */
export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.lincolnnavigation.com"
}

/** "4 November 2026", in Ghana time. */
export function longDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" })
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

/**
 * The app's email layout: a white rounded card on a soft blue background —
 * logo, a big illustration (an emoji, which every mail app draws as a
 * picture), a large bold centred heading, "Hi {name}!", centred text, one
 * button and a sign-off — then a dark footer bar with the logo and links.
 * Images are absolute URLs on the live site (public/email/*).
 */
export function emailLayout(o: {
  preheader: string
  /** Big picture above the heading, e.g. "💳". */
  emoji: string
  /** Some emoji are drawn small (💳 is short and wide); default 84. */
  emojiSize?: number
  heading: string
  /** First name, if known. */
  name?: string | null
  /** Trusted HTML, one entry per paragraph. */
  paragraphs: string[]
  button: { label: string; href: string }
  /** Small print under the sign-off (trusted HTML). */
  note?: string
  /** Why they got this email, shown under the footer. */
  reason: string
  siteUrl: string
}) {
  const font = "'Poppins',Helvetica,Arial,sans-serif"
  const p = (html: string) =>
    `<p style="margin:0 0 14px 0;font-family:${font};font-size:16px;line-height:1.65;color:#2b3440;">${html}</p>`
  const footLink = (label: string, path: string) =>
    `<a href="${o.siteUrl}${path}" style="color:#ffffff;text-decoration:none;font-family:${font};font-size:13px;font-weight:600;">${label}</a>`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<title>${escapeHtml(o.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#d9e6f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#d9e6f5;">
  <tr>
    <td align="center" style="padding:28px 14px 32px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <!-- Card -->
        <tr>
          <td align="center" style="background-color:#ffffff;border-radius:18px;padding:32px 32px 40px 32px;">
            <a href="${o.siteUrl}" style="text-decoration:none;">
              <img src="${o.siteUrl}/email/logo.png" width="208" height="117" alt="Lincoln Navigation" style="display:block;border:0;width:208px;height:117px;">
            </a>
            <div style="margin:20px auto 4px auto;font-size:${o.emojiSize ?? 84}px;line-height:1;mso-line-height-rule:exactly;">${o.emoji}</div>
            <h1 style="margin:24px 0 28px 0;font-family:${font};font-size:34px;line-height:1.2;font-weight:700;color:#1f2933;">${escapeHtml(o.heading)}</h1>
            <p style="margin:0 0 12px 0;font-family:${font};font-size:21px;line-height:1.4;font-weight:700;color:#1f2933;">Hi ${o.name ? escapeHtml(o.name) : "there"}!</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;">
              <tr><td align="center">
            ${o.paragraphs.map(p).join("\n            ")}
              </td></tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 0 auto;">
              <tr>
                <td align="center" bgcolor="#1d4466" style="border-radius:8px;">
                  <a href="${o.button.href}" style="display:inline-block;padding:15px 30px;font-family:${font};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(o.button.label)}</a>
                </td>
              </tr>
            </table>
            <p style="margin:32px 0 0 0;font-family:${font};font-size:14px;line-height:1.6;color:#8a939c;">Thanks,<br>The LincolnNavigation Team</p>
            ${o.note ? `<p style="margin:20px auto 0 auto;max-width:440px;font-family:${font};font-size:13px;line-height:1.6;color:#8a939c;">${o.note}</p>` : ""}
          </td>
        </tr>
        <tr><td style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
        <!-- Footer bar -->
        <tr>
          <td style="background-color:#171a1f;border-radius:18px;padding:18px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left" valign="middle">
                  <a href="${o.siteUrl}" style="text-decoration:none;"><img src="${o.siteUrl}/email/logo-dark.png" width="112" height="63" alt="Lincoln Navigation" style="display:block;border:0;width:112px;height:63px;border-radius:6px;"></a>
                </td>
                <td align="right" valign="middle" style="font-family:${font};font-size:13px;color:#5f6b78;">
                  ${footLink("Map", "/app")}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${footLink("Account", "/account")}&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="mailto:${CONTACT_EMAIL}" style="color:#ffffff;text-decoration:none;font-family:${font};font-size:13px;font-weight:600;">Help</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:18px 16px 0 16px;font-family:${font};font-size:12px;line-height:1.6;color:#6b7c90;">
            ${escapeHtml(o.reason)}<br>
            Questions? Just reply to this email.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
