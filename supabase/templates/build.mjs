// supabase/templates/build.mjs
//
// Generates every Supabase auth email in this folder from one layout — the
// same look as the app's own billing emails (lib/email.ts): white rounded
// card on soft blue, logo, a big illustration, bold centred heading,
// "Hi {name}!", one button, a sign-off, and a dark footer bar.
//
//   node supabase/templates/build.mjs
//
// Then paste each file into Supabase → Authentication → Emails (see README).
// Supabase fills the {{ .Placeholders }} (Go templates); logos load from the
// live site, so keep public/email/*.png deployed.

import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ASSETS = "https://www.lincolnnavigation.com/email"
const FONT = "'Poppins',Helvetica,Arial,sans-serif"
const CONTACT = "info@lincolnnavigation.com"

const confirmLink = (type, next) =>
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}&amp;next=${next}`

const SECURITY_BOX = `<strong>Wasn&rsquo;t you?</strong> Reset your password right away and check your sign-in methods.`
const SECURITY_NOTE = `If this was you, there&rsquo;s nothing else to do. We send these notices so you always know when your account changes.`
const SECURITY_REASON = "This is a security notice about your LincolnNavigation account."
const secure = { label: "Secure my account", href: "{{ .SiteURL }}/login" }

const TEMPLATES = [
  {
    file: "confirm-signup.html",
    title: "Confirm your email",
    preheader: "One tap to finish creating your LincolnNavigation account.",
    emoji: "✉️",
    heading: "Confirm your email",
    paragraphs: [
      "Thanks for joining LincolnNavigation! Confirm your email address to finish creating your account and start saving your favourite places across Ghana.",
    ],
    button: { label: "Confirm email address", href: confirmLink("email", "/app") },
    fallback: true,
    note: "Didn&rsquo;t sign up? You can safely ignore this email &mdash; no account will be created.",
    reason: "You&rsquo;re getting this because this address was used to sign up for LincolnNavigation.",
  },
  {
    file: "reset-password.html",
    title: "Reset your password",
    preheader: "Choose a new password for your LincolnNavigation account.",
    emoji: "🔑",
    heading: "Reset your password",
    paragraphs: [
      "We got a request to reset the password for your account. Tap the button below to choose a new one. For your security, this link expires soon and can only be used once.",
    ],
    button: { label: "Choose a new password", href: confirmLink("recovery", "/reset-password") },
    fallback: true,
    note: "Didn&rsquo;t ask for this? You can safely ignore this email &mdash; your password won&rsquo;t change.",
    reason: "You&rsquo;re getting this because a password reset was requested for this address.",
  },
  {
    file: "magic-link.html",
    title: "Sign in to LincolnNavigation",
    preheader: "Your one-tap sign-in link for LincolnNavigation.",
    emoji: "🔗",
    heading: "Your sign-in link",
    paragraphs: ["Tap the button below to sign in. The link works once and expires soon."],
    button: { label: "Sign in", href: confirmLink("email", "/app") },
    fallback: true,
    note: "Didn&rsquo;t ask for this? You can safely ignore this email &mdash; nothing will change.",
    reason: "You&rsquo;re getting this because a sign-in link was requested for this address.",
  },
  {
    file: "change-email.html",
    title: "Confirm your new email",
    preheader: "Confirm the change to your LincolnNavigation email address.",
    emoji: "📧",
    heading: "Confirm your new email",
    paragraphs: [
      "You asked to change the email on your LincolnNavigation account from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>. Confirm below to make the switch.",
    ],
    button: { label: "Confirm new email", href: confirmLink("email_change", "/account") },
    fallback: true,
    note: "Didn&rsquo;t ask for this? Ignore this email and your address stays the same. If you&rsquo;re worried, reset your password.",
    reason: "You&rsquo;re getting this because of a change to your LincolnNavigation account.",
  },
  {
    file: "invite-user.html",
    title: "You're invited",
    preheader: "You've been invited to join LincolnNavigation.",
    emoji: "🎉",
    heading: "You&rsquo;re invited",
    paragraphs: [
      "You&rsquo;ve been invited to join LincolnNavigation &mdash; maps, routes and live navigation made for Ghana. Accept the invite to set up your account.",
    ],
    button: { label: "Accept invite", href: confirmLink("invite", "/reset-password") },
    fallback: true,
    note: "Not expecting this? You can safely ignore this email.",
    reason: "You&rsquo;re getting this because someone invited this address to LincolnNavigation.",
  },
  {
    file: "reauthentication.html",
    title: "Your verification code",
    preheader: "Use this code to confirm it's you.",
    emoji: "🛡️",
    heading: "Confirm it&rsquo;s you",
    paragraphs: ["Enter this code in LincolnNavigation to continue. It expires in a few minutes."],
    code: "{{ .Token }}",
    note: "Didn&rsquo;t try to make a change? Someone may know your password &mdash; reset it from the sign-in page.",
    reason: SECURITY_REASON,
  },
  {
    file: "notify-password-changed.html",
    title: "Your password was changed",
    preheader: "The password on your LincolnNavigation account was just changed.",
    emoji: "🔒",
    heading: "Your password was changed",
    paragraphs: ["The password for your LincolnNavigation account (<strong>{{ .Email }}</strong>) was just changed."],
    box: SECURITY_BOX,
    button: secure,
    note: SECURITY_NOTE,
    reason: SECURITY_REASON,
  },
  {
    file: "notify-email-changed.html",
    title: "Your email address was changed",
    preheader: "The email on your LincolnNavigation account was changed.",
    emoji: "📧",
    heading: "Your email was changed",
    paragraphs: [
      "The email on your LincolnNavigation account was changed from <strong>{{ .OldEmail }}</strong> to <strong>{{ .Email }}</strong>.",
    ],
    box: SECURITY_BOX,
    button: secure,
    note: SECURITY_NOTE,
    reason: SECURITY_REASON,
  },
  {
    file: "notify-phone-changed.html",
    title: "Your phone number was changed",
    preheader: "The phone number on your LincolnNavigation account was changed.",
    emoji: "📱",
    heading: "Your phone number was changed",
    paragraphs: [
      "The phone number on your LincolnNavigation account was changed from <strong>{{ .OldPhone }}</strong> to <strong>{{ .Phone }}</strong>.",
    ],
    box: SECURITY_BOX,
    button: secure,
    note: SECURITY_NOTE,
    reason: SECURITY_REASON,
  },
  {
    file: "notify-identity-linked.html",
    title: "New sign-in method added",
    preheader: "A new way to sign in was added to your LincolnNavigation account.",
    emoji: "🔗",
    heading: "New sign-in method added",
    paragraphs: [
      "<strong>{{ .Provider }}</strong> can now be used to sign in to your LincolnNavigation account (<strong>{{ .Email }}</strong>).",
    ],
    box: SECURITY_BOX,
    button: secure,
    note: SECURITY_NOTE,
    reason: SECURITY_REASON,
  },
  {
    file: "notify-identity-unlinked.html",
    title: "Sign-in method removed",
    preheader: "A sign-in method was removed from your LincolnNavigation account.",
    emoji: "✂️",
    heading: "Sign-in method removed",
    paragraphs: [
      "<strong>{{ .Provider }}</strong> can no longer be used to sign in to your LincolnNavigation account (<strong>{{ .Email }}</strong>).",
    ],
    box: SECURITY_BOX,
    button: secure,
    note: SECURITY_NOTE,
    reason: SECURITY_REASON,
  },
  {
    file: "notify-mfa-added.html",
    title: "Two-step verification added",
    preheader: "A new verification method was added to your LincolnNavigation account.",
    emoji: "🛡️",
    heading: "Two-step verification added",
    paragraphs: [
      "A new <strong>{{ .FactorType }}</strong> verification method was added to your LincolnNavigation account (<strong>{{ .Email }}</strong>).",
    ],
    box: SECURITY_BOX,
    button: secure,
    note: SECURITY_NOTE,
    reason: SECURITY_REASON,
  },
  {
    file: "notify-mfa-removed.html",
    title: "Two-step verification removed",
    preheader: "A verification method was removed from your LincolnNavigation account.",
    emoji: "⚠️",
    heading: "Two-step verification removed",
    paragraphs: [
      "A <strong>{{ .FactorType }}</strong> verification method was removed from your LincolnNavigation account (<strong>{{ .Email }}</strong>).",
    ],
    box: SECURITY_BOX,
    button: secure,
    note: SECURITY_NOTE,
    reason: SECURITY_REASON,
  },
]

function render(t) {
  const p = (html) =>
    `<p style="margin:0 0 14px 0;font-family:${FONT};font-size:16px;line-height:1.65;color:#2b3440;">${html}</p>`
  const footLink = (label, href) =>
    `<a href="${href}" style="color:#ffffff;text-decoration:none;font-family:${FONT};font-size:13px;font-weight:600;">${label}</a>`

  const code = t.code
    ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0 auto;">
              <tr>
                <td align="center" style="background-color:#eef3f9;border-radius:12px;padding:18px 28px;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1f2933;">${t.code}</td>
              </tr>
            </table>`
    : ""
  const box = t.box
    ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px auto 0 auto;max-width:440px;">
              <tr>
                <td align="center" style="background-color:#eef3f9;border-radius:12px;padding:16px 20px;font-family:${FONT};font-size:15px;line-height:1.6;color:#1f2933;">${t.box}</td>
              </tr>
            </table>`
    : ""
  const button = t.button
    ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 0 auto;">
              <tr>
                <td align="center" bgcolor="#1d4466" style="border-radius:8px;">
                  <a href="${t.button.href}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${t.button.label}</a>
                </td>
              </tr>
            </table>`
    : ""
  const fallback = t.fallback
    ? `
            <p style="margin:18px auto 0 auto;max-width:440px;font-family:${FONT};font-size:12px;line-height:1.6;color:#8a939c;">Button not working? Copy this link into your browser:<br><a href="${t.button.href}" style="color:#1d4466;word-break:break-all;">${t.button.href}</a></p>`
    : ""

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<title>${t.title}</title>
</head>
<!-- Generated by build.mjs — edit there, then re-paste into Supabase. -->
<body style="margin:0;padding:0;background-color:#d9e6f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${t.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#d9e6f5;">
  <tr>
    <td align="center" style="padding:28px 14px 32px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <!-- Card -->
        <tr>
          <td align="center" style="background-color:#ffffff;border-radius:18px;padding:32px 32px 40px 32px;">
            <a href="{{ .SiteURL }}" style="text-decoration:none;">
              <img src="${ASSETS}/logo.png" width="208" height="117" alt="Lincoln Navigation" style="display:block;border:0;width:208px;height:117px;">
            </a>
            <div style="margin:20px auto 4px auto;font-size:84px;line-height:1;mso-line-height-rule:exactly;">${t.emoji}</div>
            <h1 style="margin:24px 0 28px 0;font-family:${FONT};font-size:34px;line-height:1.2;font-weight:700;color:#1f2933;">${t.heading}</h1>
            <p style="margin:0 0 12px 0;font-family:${FONT};font-size:21px;line-height:1.4;font-weight:700;color:#1f2933;">Hi{{ if .Data.full_name }} {{ .Data.full_name }}{{ else }} there{{ end }}!</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;">
              <tr><td align="center">
            ${t.paragraphs.map(p).join("\n            ")}
              </td></tr>
            </table>${code}${box}${button}${fallback}
            <p style="margin:32px 0 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:#8a939c;">Thanks,<br>The LincolnNavigation Team</p>
            <p style="margin:20px auto 0 auto;max-width:440px;font-family:${FONT};font-size:13px;line-height:1.6;color:#8a939c;">${t.note}</p>
          </td>
        </tr>
        <tr><td style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
        <!-- Footer bar -->
        <tr>
          <td style="background-color:#171a1f;border-radius:18px;padding:18px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left" valign="middle">
                  <a href="{{ .SiteURL }}" style="text-decoration:none;"><img src="${ASSETS}/logo-dark.png" width="112" height="63" alt="Lincoln Navigation" style="display:block;border:0;width:112px;height:63px;border-radius:6px;"></a>
                </td>
                <td align="right" valign="middle" style="font-family:${FONT};font-size:13px;color:#5f6b78;">
                  ${footLink("Map", "{{ .SiteURL }}/app")}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${footLink("Account", "{{ .SiteURL }}/account")}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${footLink("Help", `mailto:${CONTACT}`)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:18px 16px 0 16px;font-family:${FONT};font-size:12px;line-height:1.6;color:#6b7c90;">
            ${t.reason}<br>
            Questions? Just reply to this email or write to <a href="mailto:${CONTACT}" style="color:#1d4466;">${CONTACT}</a>.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`
}

for (const t of TEMPLATES) {
  writeFileSync(join(HERE, t.file), render(t))
  console.log("wrote", t.file)
}
