// app/api/paystack/webhook/route.ts
//
// Paystack calls this server-to-server after every successful charge, so a
// payment is recorded even if the buyer closes the tab or loses signal before
// Paystack sends them back to /api/billing/verify or /api/sponsor/verify.
//
//   charge.success + plan tag     → plan_purchases row (restorable on any
//                                   device; linked to the account if the
//                                   buyer was signed in at checkout)
//   charge.success + sponsor_id   → sponsor listing → pending_review, or on a
//                                   renewal (kind "renewal") +SPONSOR_DAYS
//   charge.success on our plan    → a monthly renewal: another plan_purchases
//                                   row, linked to the same account
//   subscription.*                → plan_subscriptions row (status, next
//                                   payment date, card) for /account
//   invoice.*                     → subscription status / next payment date;
//                                   payment_failed also emails the customer
//   subscription.expiring_cards   → emails customers whose card runs out
//   anything else                 → 200, ignored
//
// It records payments only; the browser still gets its cookie from verify or
// /api/billing/restore. Every write is idempotent, because Paystack retries
// and the browser return may handle the same payment too.
//
// Paystack dashboard → Settings → API Keys & Webhooks → Webhook URL:
//   https://www.lincolnnavigation.com/api/paystack/webhook
//
// Requires env: PAYSTACK_SECRET_KEY (also signs the webhook),
//               SUPABASE_SERVICE_ROLE_KEY

import { NextResponse } from "next/server"
import {
  disableSubscription,
  isValidWebhookSignature,
  markSponsorPaid,
  markSponsorRenewed,
  planForPaystackPlan,
  planPayment,
  type PaystackPlanRef,
  txPlan,
  type PaystackTx,
} from "@/lib/paystack"
import { sendCardExpiring, sendRenewalFailed } from "@/lib/billing-emails"
import {
  accountForEmail,
  getSubscription,
  linkSubscriptions,
  otherRenewingSubscriptions,
  recordPurchase,
  updateSubscription,
  upsertSubscription,
} from "@/lib/plan-store"

/** The fields we use from subscription.* events. */
interface PaystackSubscription {
  subscription_code?: string
  email_token?: string
  status?: string
  next_payment_date?: string | null
  plan?: PaystackPlanRef | null
  customer?: { email?: string; customer_code?: string }
  authorization?: { brand?: string; card_type?: string; last4?: string }
}

/** The fields we use from invoice.* events. */
interface PaystackInvoice {
  invoice_code?: string
  subscription?: { subscription_code?: string; status?: string; next_payment_date?: string | null }
}

/** One entry of subscription.expiring_cards (sent at the start of each month). */
interface ExpiringCard {
  expiry_date?: string
  description?: string
  subscription?: { subscription_code?: string }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ok = () => NextResponse.json({ received: true })
// A non-2xx makes Paystack retry later — only for failures on our side.
const retry = () => NextResponse.json({ error: "could not record" }, { status: 500 })

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: "Billing is not configured." }, { status: 501 })

  // The signature covers the exact bytes Paystack sent, so read the raw body.
  const raw = await req.text()
  if (!isValidWebhookSignature(raw, req.headers.get("x-paystack-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 })
  }

  let event: { event?: string; data?: unknown }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 })
  }

  const type = event.event ?? ""
  if (type === "charge.success") return onCharge(event.data as PaystackTx | undefined)
  if (type === "subscription.expiring_cards") return onExpiringCards(event.data)
  if (type.startsWith("subscription.")) return onSubscription(type, event.data as PaystackSubscription | undefined, secret)
  if (type.startsWith("invoice.")) return onInvoice(type, event.data as PaystackInvoice | undefined)
  return ok()
}

async function onCharge(tx: PaystackTx | undefined) {
  const reference = tx?.reference
  if (!tx || !reference) return ok()

  // Sponsored listing: a renewal from the emailed link, or a new one.
  if (tx.metadata?.sponsor_id && tx.metadata.kind === "renewal") {
    const result = await markSponsorRenewed(tx, reference)
    if (result === "error") return retry()
    if (result === "not-a-renewal") console.warn("[paystack webhook] renewal charge didn't match its listing:", reference)
    return ok()
  }
  if (tx.metadata?.sponsor_id) {
    const result = await markSponsorPaid(tx, reference)
    if (result === "error") return retry()
    if (result === "not-a-listing") console.warn("[paystack webhook] sponsor charge didn't cover a package:", reference)
    return ok()
  }

  // Premium / Pro: the first payment, or a monthly renewal.
  const payment = planPayment(tx)
  if (!payment.ok) {
    // Not ours (another product on the account) or already past its period.
    if (tx.metadata?.plan || txPlan(tx)) {
      console.warn("[paystack webhook] plan charge not accepted:", reference, payment.reason)
    }
    return ok()
  }

  // The first charge says who bought it; renewals carry no metadata, so they
  // follow the account earlier payments from this email are linked to.
  const metaUser = tx.metadata?.user_id
  const fromCheckout = metaUser && UUID.test(metaUser) ? metaUser : null
  const userId = fromCheckout ?? (await accountForEmail(payment.email))
  const purchase = {
    reference,
    plan: payment.plan,
    email: payment.email,
    paidAtMs: payment.paidAtMs,
    expiresAtSec: payment.expiresAtSec,
  }
  let saved = await recordPurchase({ ...purchase, userId })
  // An account deleted since checkout would fail the user link; keep the
  // payment anyway — it can still be restored by email.
  if (!saved && userId) saved = await recordPurchase({ ...purchase, userId: null })
  // subscription.create may have arrived first, before we knew the account.
  if (saved && fromCheckout) await linkSubscriptions(payment.email, fromCheckout)
  return saved ? ok() : retry()
}

async function onSubscription(type: string, sub: PaystackSubscription | undefined, secret: string) {
  const code = sub?.subscription_code
  const email = sub?.customer?.email
  const plan = planForPaystackPlan(sub?.plan)
  // Only our Premium / Pro plans; subscription.expiring_cards has a list instead.
  if (!sub || !code || !email || !plan) return ok()

  const saved = await upsertSubscription({
    code,
    plan,
    email,
    status: sub.status ?? "active",
    emailToken: sub.email_token,
    customerCode: sub.customer?.customer_code,
    nextPaymentAt: sub.next_payment_date ?? null,
    cardBrand: sub.authorization?.brand ?? sub.authorization?.card_type,
    cardLast4: sub.authorization?.last4,
  })
  if (!saved) return retry()

  // Moving up to Pro: stop the Premium subscription so they aren't charged
  // for both. Pro includes Premium, and what Premium already paid for stays.
  if (type === "subscription.create" && plan === "pro") {
    for (const other of await otherRenewingSubscriptions(email, code)) {
      if (other.plan !== "premium" || !other.email_token) continue
      if (await disableSubscription(other.subscription_code, other.email_token, secret)) {
        await updateSubscription(other.subscription_code, { status: "cancelled" })
      } else {
        console.error("[paystack webhook] couldn't stop Premium after Pro upgrade:", other.subscription_code)
      }
    }
  }
  return ok()
}

async function onInvoice(type: string, invoice: PaystackInvoice | undefined) {
  const sub = invoice?.subscription
  const code = sub?.subscription_code
  if (!code) return ok()
  const fields: { status?: string; next_payment_at?: string | null } = {}
  // A failed renewal isn't retried until the next payment date, so the plan
  // ends with the period already paid for unless they update their card.
  if (type === "invoice.payment_failed") fields.status = "attention"
  else if (sub.status) fields.status = sub.status
  if (sub.next_payment_date !== undefined) fields.next_payment_at = sub.next_payment_date
  if (Object.keys(fields).length > 0 && !(await updateSubscription(code, fields))) return retry()

  if (type === "invoice.payment_failed") {
    const row = await getSubscription(code).catch(() => null)
    // Each failed attempt is its own invoice, so it gets its own email.
    const attempt = invoice?.invoice_code || sub.next_payment_date || new Date().toISOString().slice(0, 10)
    if (row && !(await sendRenewalFailed(row, attempt))) return retry()
  }
  return ok()
}

async function onExpiringCards(data: unknown) {
  if (!Array.isArray(data)) return ok()
  let failed = false
  for (const card of data as ExpiringCard[]) {
    const code = card.subscription?.subscription_code
    if (!code || !card.expiry_date) continue
    // Only our subscriptions (the row exists) that are still renewing.
    const row = await getSubscription(code).catch(() => null)
    if (row && !(await sendCardExpiring(row, card.expiry_date, card.description))) failed = true
  }
  // Already-sent emails are skipped on the retry.
  return failed ? retry() : ok()
}
