// app/api/paystack/webhook/route.ts
//
// Paystack calls this server-to-server after every successful charge, so a
// payment is recorded even if the buyer closes the tab or loses signal before
// Paystack sends them back to /api/billing/verify or /api/sponsor/verify.
//
//   charge.success + plan tag     → plan_purchases row (restorable on any
//                                   device; linked to the account if the
//                                   buyer was signed in at checkout)
//   charge.success + sponsor_id   → sponsor listing → pending_review
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
import { isValidWebhookSignature, markSponsorPaid, planPayment, type PaystackTx } from "@/lib/paystack"
import { recordPurchase } from "@/lib/plan-store"

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

  let event: { event?: string; data?: PaystackTx }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 })
  }

  const tx = event.data
  const reference = tx?.reference
  if (event.event !== "charge.success" || !tx || !reference) return ok()

  // Sponsored listing.
  if (tx.metadata?.sponsor_id) {
    const result = await markSponsorPaid(tx, reference)
    if (result === "error") return retry()
    if (result === "not-a-listing") console.warn("[paystack webhook] sponsor charge didn't cover a package:", reference)
    return ok()
  }

  // Premium / Pro plan.
  const payment = planPayment(tx)
  if (!payment.ok) {
    // Not ours (another product on the account) or already past its 31 days.
    if (tx.metadata?.plan) console.warn("[paystack webhook] plan charge not accepted:", reference, payment.reason)
    return ok()
  }

  const metaUser = tx.metadata?.user_id
  const userId = metaUser && UUID.test(metaUser) ? metaUser : null
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
  return saved ? ok() : retry()
}
