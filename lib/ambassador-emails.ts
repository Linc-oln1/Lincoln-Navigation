// lib/ambassador-emails.ts  (server only)
//
// The welcome email a new promoter gets: their target, their personal
// referral code and link, and where to watch their numbers.

import { emailLayout, escapeHtml, sendEmail, siteUrl } from "@/lib/email"
import { PAY_BLOCK_SUBSCRIBERS, PAY_PER_BLOCK_GHS, TARGET_SUBSCRIBERS, TARGET_USERS } from "@/lib/ambassadors"

export function referralLink(code: string) {
  return `${siteUrl()}/signup?ref=${code}`
}

/** Returns false if email is off or Resend refused it. */
export async function sendAmbassadorWelcome(to: { email: string; name: string | null; code: string }) {
  const link = referralLink(to.code)
  const first = to.name?.trim().split(/\s+/)[0]?.slice(0, 40) || null
  const money = `GHS ${PAY_PER_BLOCK_GHS.toLocaleString()}`
  const dashboard = `${siteUrl()}/ambassador`

  const box = (label: string, value: string) =>
    `<span style="display:block;margin:4px 0;font-size:15px;"><strong>${label}:</strong> <span style="font-family:monospace;font-weight:700;word-break:break-all;">${escapeHtml(value)}</span></span>`

  return sendEmail({
    to: to.email,
    subject: "Your Lincoln Navigation promoter link",
    html: emailLayout({
      preheader: `Your referral code is ${to.code}`,
      emoji: "🚀",
      heading: "You're on the team",
      name: first,
      paragraphs: [
        `Here's everything you need to get started.`,
        `<strong>Your target</strong><br>New users: ${TARGET_USERS}<br>Premium/Pro subscribers (within the ${TARGET_USERS}): ${TARGET_SUBSCRIBERS}<br>Earnings: ${money} per ${PAY_BLOCK_SUBSCRIBERS} verified Premium/Pro subscribers`,
        box("Referral code", to.code) + box("Referral link", link),
        `Share your link. Everyone who signs up with it and confirms their email counts as one of your users, and you can watch your numbers live on your dashboard.`,
      ],
      button: { label: "Open your dashboard", href: dashboard },
      reason: "You're getting this because you were added as a Lincoln Navigation promoter.",
      siteUrl: siteUrl(),
    }),
    text: [
      `Hi ${first ?? "there"}!`,
      "",
      "Here's everything you need to get started.",
      "",
      "YOUR TARGET AT A GLANCE",
      `- Total new users: ${TARGET_USERS}`,
      `- Premium/Pro subscribers (within the ${TARGET_USERS}): ${TARGET_SUBSCRIBERS}`,
      `- Earnings: ${money} per ${PAY_BLOCK_SUBSCRIBERS} verified Premium/Pro subscribers`,
      "",
      `Referral code: ${to.code}`,
      `Referral link: ${link}`,
      "",
      `Your dashboard: ${dashboard}`,
      "",
      "Thanks,",
      "The Lincoln Navigation Team",
    ].join("\n"),
  })
}
