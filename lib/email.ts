// lib/email.ts  (server only)
//
// Transactional email from the app itself, through Resend's HTTP API (the
// same Resend account and verified lincolnnavigation.com domain that
// Supabase uses for sign-in emails). Off until RESEND_API_KEY is set.
//
// Env: RESEND_API_KEY   (re_…)
//      EMAIL_FROM       optional, default "Lincoln Navigation <billing@lincolnnavigation.com>"

import { CONTACT_EMAIL } from "@/lib/legal"

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

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

/**
 * The house email layout (same look as supabase/templates/*): wordmark, a
 * cream card with an eyebrow, heading, paragraphs (trusted HTML), one
 * button, and the standard footer.
 */
export function emailLayout(o: {
  preheader: string
  eyebrow: string
  heading: string
  paragraphs: string[]
  button: { label: string; href: string }
  note?: string
  siteUrl: string
}) {
  const p = (html: string, color = "#3d4b58", margin = "0 0 16px 0", size = 16) =>
    `<p style="margin:${margin};font-family:Helvetica,Arial,sans-serif;font-size:${size}px;line-height:1.6;color:${color};">${html}</p>`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(o.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1efe7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1efe7;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 8px 20px 8px;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#14263a;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:5px;background-color:#4caf6e;margin-right:8px;vertical-align:middle;"></span>LincolnNavigation
          </td>
        </tr>
        <tr>
          <td style="background-color:#fdfcf7;border:1px solid #e6e2d6;border-radius:24px;padding:40px 36px;">
            <p style="margin:0 0 12px 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#5b6875;">${escapeHtml(o.eyebrow)}</p>
            <h1 style="margin:0 0 20px 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:normal;color:#14263a;">${escapeHtml(o.heading)}</h1>
            ${o.paragraphs.map((html) => p(html)).join("\n            ")}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;">
              <tr>
                <td align="center" bgcolor="#1d4466" style="border-radius:16px;">
                  <a href="${o.button.href}" style="display:block;padding:17px 24px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:16px;">${escapeHtml(o.button.label)} &rarr;</a>
                </td>
              </tr>
            </table>
            ${o.note ? p(o.note, "#5b6875", "28px 0 0 0", 14) : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 8px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#7a8590;">
            Find your way. Feel the journey.<br>
            LincolnNavigation &middot; Ghana maps &amp; navigation &middot; <a href="${o.siteUrl}" style="color:#1d4466;text-decoration:underline;">lincolnnavigation.com</a><br>
            Questions? Just reply to this email or write to <a href="mailto:${CONTACT_EMAIL}" style="color:#1d4466;text-decoration:underline;">${CONTACT_EMAIL}</a>.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
