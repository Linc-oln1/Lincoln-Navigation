// lib/billing-emails.ts  (server only)
//
// Emails the webhook sends about a Premium / Pro subscription, so a customer
// hears about a problem before their plan quietly runs out:
//
//   renewalFailed  — invoice.payment_failed. Paystack won't try again until
//                    the next payment date, so the plan ends with the period
//                    already paid for unless they update their card.
//   cardExpiring   — subscription.expiring_cards (start of each month).
//
// Both point to /account, where "Update card" opens Paystack's page. Each is
// sent at most once per event (Redis key for 45 days), since Paystack may
// deliver the same webhook more than once.

import { bump } from "@/lib/rate-limit"
import { EMAIL_ENABLED, emailLayout, escapeHtml, sendEmail } from "@/lib/email"
import { paidUntil, RENEWING, type SubscriptionRow } from "@/lib/plan-store"

const ONCE_WINDOW_S = 45 * 86_400

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.lincolnnavigation.com"
}

function planName(sub: SubscriptionRow) {
  return sub.plan === "pro" ? "Pro" : "Premium"
}

function longDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" })
}

/**
 * Send once per `key`: the first caller claims it. If sending fails the claim
 * is released and false comes back, so a Paystack retry can try again.
 */
async function sendOnce(key: string, send: () => Promise<boolean>): Promise<boolean> {
  if (!EMAIL_ENABLED) return true
  const claimKey = `email:once:${key}`
  if ((await bump(claimKey, ONCE_WINDOW_S)) > 1) return true
  if (await send()) return true
  await bump(claimKey, ONCE_WINDOW_S, -1)
  return false
}

/** A renewal charge failed. `eventKey` identifies this attempt (invoice code). */
export async function sendRenewalFailed(sub: SubscriptionRow, eventKey: string): Promise<boolean> {
  const plan = planName(sub)
  const until = await paidUntil(sub.email).catch(() => null)
  const stillOn = until && until.getTime() > Date.now()
  const card = sub.card_last4 ? `the card ending ${sub.card_last4}` : "your card"
  const accountUrl = `${siteUrl()}/account`

  const lead = stillOn
    ? `Your plan stays on until <strong>${escapeHtml(longDate(until!))}</strong>. Update your card before then to keep it without a break.`
    : `Update your card to keep using ${plan}.`

  return sendOnce(`renewal-failed:${sub.subscription_code}:${eventKey}`, () =>
    sendEmail({
      to: sub.email,
      subject: `Your ${plan} renewal didn't go through`,
      html: emailLayout({
        preheader: `We couldn't charge ${card} for your ${plan} plan.`,
        eyebrow: "Billing",
        heading: `Your ${plan} renewal didn't go through`,
        paragraphs: [
          `We tried to renew your Lincoln Navigation ${plan} plan, but the payment on ${escapeHtml(card)} was declined. This often happens when a card has expired, has run out of funds, or the bank blocked an online payment.`,
          lead,
          `We won't try the old card again until your next payment date, so nothing else happens unless you act.`,
        ],
        button: { label: "Update my card", href: accountUrl },
        note: `On your account page, choose <strong>Update card</strong> under Plan. Paystack handles the card details; we never see them. If you'd rather stop, choose <strong>Cancel auto-renew</strong> instead.`,
        siteUrl: siteUrl(),
      }),
      text: [
        `Your ${plan} renewal didn't go through`,
        ``,
        `We tried to renew your Lincoln Navigation ${plan} plan, but the payment on ${card} was declined.`,
        stillOn ? `Your plan stays on until ${longDate(until!)}. Update your card before then to keep it.` : `Update your card to keep using ${plan}.`,
        ``,
        `Update your card: ${accountUrl} (Plan → Update card)`,
        ``,
        `Questions? Reply to this email.`,
      ].join("\n"),
    }),
  )
}

/** The card on a still-renewing subscription expires this month. `expiry` like "12/2026". */
export async function sendCardExpiring(sub: SubscriptionRow, expiry: string, description?: string): Promise<boolean> {
  if (!RENEWING.includes(sub.status)) return true
  const plan = planName(sub)
  // Paystack writes these like "visa ending with 4081".
  const described = description?.trim()
  const card = described
    ? described.charAt(0).toUpperCase() + described.slice(1)
    : sub.card_last4
      ? `card ending ${sub.card_last4}`
      : "your card"
  const next = sub.next_payment_at ? new Date(sub.next_payment_at) : null
  const accountUrl = `${siteUrl()}/account`

  return sendOnce(`card-expiring:${sub.subscription_code}:${expiry}`, () =>
    sendEmail({
      to: sub.email,
      subject: `The card for your ${plan} plan expires soon`,
      html: emailLayout({
        preheader: `Update your card so your ${plan} plan keeps renewing.`,
        eyebrow: "Billing",
        heading: "Your card expires soon",
        paragraphs: [
          `The ${escapeHtml(card)} that pays for your Lincoln Navigation ${plan} plan expires <strong>${escapeHtml(expiry)}</strong>.`,
          next
            ? `Your next payment is due on <strong>${escapeHtml(longDate(next))}</strong>. Add your new card before then so the renewal goes through.`
            : `Add your new card so your next renewal goes through.`,
        ],
        button: { label: "Update my card", href: accountUrl },
        note: `On your account page, choose <strong>Update card</strong> under Plan. Paystack handles the card details; we never see them.`,
        siteUrl: siteUrl(),
      }),
      text: [
        `Your card expires soon`,
        ``,
        `The ${card} that pays for your Lincoln Navigation ${plan} plan expires ${expiry}.`,
        next ? `Your next payment is due on ${longDate(next)}. Add your new card before then.` : `Add your new card so your next renewal goes through.`,
        ``,
        `Update your card: ${accountUrl} (Plan → Update card)`,
      ].join("\n"),
    }),
  )
}
