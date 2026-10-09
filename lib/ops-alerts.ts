// lib/ops-alerts.ts  (server only)
//
// Tells the admins (ADMIN_EMAILS) when the Paystack webhook couldn't record a
// payment or subscription change — a database write failed, or the handler
// crashed — so it doesn't go unnoticed until a customer complains. Paystack
// retries failed webhooks on its own; if a later retry goes through, a short
// "recovered" email follows so nobody chases a problem that fixed itself.
//
// One alert per failed event and one recovery per event (sendOnce), however
// many times Paystack retries.

import { adminEmails } from "@/lib/admin-auth"
import { emailLayout, escapeHtml, sendEmail, sendOnce, siteUrl } from "@/lib/email"
import { bump, peek } from "@/lib/rate-limit"

const FAILED_MARK_S = 7 * 86_400

export interface WebhookFailure {
  /** Paystack event, e.g. "charge.success". */
  type: string
  /** Transaction reference or subscription code — what to search for in Paystack. */
  ref: string
  /** What went wrong, in a few words. */
  reason: string
  email?: string | null
  /** e.g. "GHS 90.00". */
  amount?: string | null
}

const markKey = (f: { type: string; ref: string }) => `webhook-failed:${f.type}:${f.ref}`

async function toAdmins(key: string, subject: string, html: Parameters<typeof emailLayout>[0], text: string[]) {
  for (const to of adminEmails()) {
    await sendOnce(`${key}:${to}`, () => sendEmail({ to, subject, html: emailLayout(html), text: text.join("\n") }))
  }
}

/** Paystack's transactions page (search it for the reference). */
function paystackLink(_ref: string) {
  return "https://dashboard.paystack.com/#/transactions"
}

/** The webhook answered 500 (Paystack will retry). Never throws. */
export async function alertWebhookFailure(f: WebhookFailure): Promise<void> {
  console.error("[paystack webhook] FAILED", f.type, f.ref, f.reason)
  try {
    await bump(markKey(f), FAILED_MARK_S)
    const who = [f.email, f.amount].filter(Boolean).join(" · ")
    await toAdmins(
      `webhook-fail-alert:${f.type}:${f.ref}`,
      `⚠️ Payment not recorded: ${f.ref}`,
      {
        preheader: `Paystack ${f.type} for ${f.ref} couldn't be recorded. Paystack will retry.`,
        emoji: "⚠️",
        heading: "A payment wasn't recorded",
        paragraphs: [
          `Paystack sent <strong>${escapeHtml(f.type)}</strong> for <strong>${escapeHtml(f.ref)}</strong>${who ? ` (${escapeHtml(who)})` : ""}, and the site couldn't record it: ${escapeHtml(f.reason)}.`,
          `Search Paystack for that reference to see the payment. Paystack retries automatically over the next few hours. If a retry works you'll get a "recovered" email and there's nothing to do. If not, check Vercel's logs and Supabase, and make sure the customer got what they paid for.`,
        ],
        button: { label: "Open Paystack transactions", href: paystackLink(f.ref) },
        note: `Customers' plans also show in <a href="${siteUrl()}/admin/billing">/admin/billing</a> once recorded.`,
        reason: "You're getting this because your address is in ADMIN_EMAILS for Lincoln Navigation.",
        siteUrl: siteUrl(),
      },
      [
        `A payment wasn't recorded`,
        ``,
        `Paystack ${f.type} for ${f.ref}${who ? ` (${who})` : ""}: ${f.reason}.`,
        `Paystack retries automatically. If it recovers you'll get another email; if not, check Vercel logs and Supabase.`,
        ``,
        `Paystack: ${paystackLink(f.ref)}`,
      ],
    )
  } catch (error) {
    console.error("[ops alerts] could not send failure alert:", error)
  }
}

/** The webhook succeeded; if this event failed earlier, say it recovered. Never throws. */
export async function noteWebhookRecovered(f: { type: string; ref: string }): Promise<void> {
  try {
    if ((await peek(markKey(f))) <= 0) return
    await toAdmins(
      `webhook-recovered:${f.type}:${f.ref}`,
      `✅ Recovered: ${f.ref} recorded`,
      {
        preheader: `Paystack's retry of ${f.ref} went through.`,
        emoji: "✅",
        heading: "Recovered — nothing to do",
        paragraphs: [
          `Paystack retried <strong>${escapeHtml(f.type)}</strong> for <strong>${escapeHtml(f.ref)}</strong> and this time it was recorded. Nothing else needed.`,
        ],
        button: { label: "Open billing", href: `${siteUrl()}/admin/billing` },
        reason: "You're getting this because your address is in ADMIN_EMAILS for Lincoln Navigation.",
        siteUrl: siteUrl(),
      },
      [`Recovered: Paystack retried ${f.type} for ${f.ref} and it was recorded. Nothing to do.`],
    )
  } catch (error) {
    console.error("[ops alerts] could not send recovery note:", error)
  }
}
