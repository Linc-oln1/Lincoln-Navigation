// lib/billing-emails.ts  (server only)
//
// Emails the webhook sends about a Premium / Pro subscription, so a customer
// hears about a problem before their plan quietly runs out:
//
//   renewalFailed  — invoice.payment_failed. Paystack won't try again until
//                    the next payment date, so the plan ends with the period
//                    already paid for unless they update their card.
//   cardExpiring   — subscription.expiring_cards (start of each month).
//   planEnding     — from the daily cron: a plan that won't renew by itself
//                    (pay-once, or a cancelled subscription) ends in a few days.
//
// The first two point to /account, where "Update card" opens Paystack's page;
// planEnding points to /pricing to pay again. Each is sent at most once per
// event (sendOnce), since webhooks can repeat and the cron runs daily.

import { emailLayout, escapeHtml, longDate, sendEmail, sendOnce, siteUrl } from "@/lib/email"
import { paidUntil, RENEWING, type SubscriptionRow } from "@/lib/plan-store"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

function planName(sub: SubscriptionRow) {
  return sub.plan === "pro" ? "Pro" : "Premium"
}

/** The account holder's first name for "Hi …!", if their profile has one. */
async function firstName(sub: { user_id: string | null }): Promise<string | null> {
  if (!sub.user_id || !ADMIN_ENABLED) return null
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(sub.user_id)
    const meta = data.user?.user_metadata as { full_name?: string; name?: string } | undefined
    const full = (meta?.full_name || meta?.name || "").trim()
    return full ? full.split(/\s+/)[0].slice(0, 40) : null
  } catch {
    return null
  }
}

function reason(sub: SubscriptionRow) {
  return `You're getting this because you have a ${planName(sub)} subscription with LincolnNavigation.`
}

/** A renewal charge failed. `eventKey` identifies this attempt (invoice code). */
export async function sendRenewalFailed(sub: SubscriptionRow, eventKey: string): Promise<boolean> {
  const plan = planName(sub)
  const until = await paidUntil(sub.email).catch(() => null)
  const stillOn = until && until.getTime() > Date.now()
  const card = sub.card_last4 ? `the card ending ${sub.card_last4}` : "your card"
  const accountUrl = `${siteUrl()}/account`

  return sendOnce(`renewal-failed:${sub.subscription_code}:${eventKey}`, async () =>
    sendEmail({
      to: sub.email,
      subject: `Your ${plan} renewal didn't go through`,
      html: emailLayout({
        preheader: `We couldn't charge ${card} for your ${plan} plan.`,
        emoji: "💳",
        emojiSize: 112,
        heading: "Your renewal didn't go through",
        name: await firstName(sub),
        paragraphs: [
          `We tried to renew your ${plan} plan, but the payment on ${escapeHtml(card)} was declined.`,
          stillOn
            ? `Your plan stays on until <strong>${escapeHtml(longDate(until!))}</strong>. Update your card before then to keep it without a break.`
            : `Update your card to keep using ${plan}.`,
        ],
        button: { label: "Update my card", href: accountUrl },
        note: `This often happens when a card has expired, run out of funds, or the bank blocked an online payment. We won't try the old card again until your next payment date. Rather stop? Choose <strong>Cancel auto-renew</strong> on your account page.`,
        reason: reason(sub),
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
        `Thanks,`,
        `The LincolnNavigation Team`,
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
      ? `Card ending ${sub.card_last4}`
      : "Your card"
  const next = sub.next_payment_at ? new Date(sub.next_payment_at) : null
  const accountUrl = `${siteUrl()}/account`

  return sendOnce(`card-expiring:${sub.subscription_code}:${expiry}`, async () =>
    sendEmail({
      to: sub.email,
      subject: `The card for your ${plan} plan expires soon`,
      html: emailLayout({
        preheader: `Update your card so your ${plan} plan keeps renewing.`,
        emoji: "⏳",
        heading: "Your card expires soon",
        name: await firstName(sub),
        paragraphs: [
          `The card that pays for your ${plan} plan (${escapeHtml(card)}) expires <strong>${escapeHtml(expiry)}</strong>.`,
          next
            ? `Your next payment is on <strong>${escapeHtml(longDate(next))}</strong>. Add your new card before then so it goes through.`
            : `Add your new card so your next renewal goes through.`,
        ],
        button: { label: "Update my card", href: accountUrl },
        note: `Paystack handles your card details; we never see them.`,
        reason: reason(sub),
        siteUrl: siteUrl(),
      }),
      text: [
        `Your card expires soon`,
        ``,
        `The card that pays for your Lincoln Navigation ${plan} plan (${card}) expires ${expiry}.`,
        next ? `Your next payment is on ${longDate(next)}. Add your new card before then.` : `Add your new card so your next renewal goes through.`,
        ``,
        `Update your card: ${accountUrl} (Plan → Update card)`,
        ``,
        `Thanks,`,
        `The LincolnNavigation Team`,
      ].join("\n"),
    }),
  )
}

/**
 * A plan that won't renew by itself ends soon. `endsAt` is when the latest
 * payment from this email stops covering it.
 */
export async function sendPlanEnding(p: {
  email: string
  plan: "premium" | "pro"
  user_id: string | null
  expires_at: string
}): Promise<boolean> {
  const plan = p.plan === "pro" ? "Pro" : "Premium"
  const ends = longDate(new Date(p.expires_at))
  const url = `${siteUrl()}/pricing${p.plan === "pro" ? "?plan=pro" : ""}`
  const perks =
    p.plan === "pro"
      ? "your fleet tools, truck routing, route planner and everything in Premium"
      : "voice navigation, Live View, offline maps and no ads"

  return sendOnce(`plan-ending:${p.email.toLowerCase()}:${p.expires_at}`, async () =>
    sendEmail({
      to: p.email,
      subject: `Your ${plan} plan ends on ${ends}`,
      html: emailLayout({
        preheader: `Pay again to keep ${perks}.`,
        emoji: "⏳",
        heading: `Your ${plan} ends soon`,
        name: await firstName(p),
        paragraphs: [
          `Your Lincoln Navigation ${plan} plan ends on <strong>${escapeHtml(ends)}</strong>. It doesn't renew by itself.`,
          `To keep ${escapeHtml(perks)}, pay for another 31 days with Mobile Money, bank or card. Paying early is fine — the new days start when these run out.`,
        ],
        button: { label: `Keep ${plan}`, href: url },
        note: `Tired of remembering? Choose <strong>Monthly</strong> on the pricing page and your card renews it automatically. You can cancel any time.`,
        reason: `You're getting this because you have a ${plan} plan on LincolnNavigation.`,
        siteUrl: siteUrl(),
      }),
      text: [
        `Your ${plan} ends soon`,
        ``,
        `Your Lincoln Navigation ${plan} plan ends on ${ends}. It doesn't renew by itself.`,
        `Pay for another 31 days with Mobile Money, bank or card: ${url}`,
        `Paying early is fine — the new days start when these run out.`,
        ``,
        `Thanks,`,
        `The LincolnNavigation Team`,
      ].join("\n"),
    }),
  )
}
