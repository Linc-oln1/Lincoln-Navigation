// lib/paystack.ts  (server only)
//
// What a successful Paystack transaction buys, decided in one place so the
// browser return (/api/billing/verify, /api/sponsor/verify) and the webhook
// (/api/paystack/webhook) always agree. Also the Paystack Plans behind the
// monthly Premium / Pro subscriptions, and the cancel / manage-card calls.

import { createHmac, timingSafeEqual } from "node:crypto"
import type { PaidPlan } from "@/lib/premium-cookie"
import {
  PREMIUM_CURRENCY,
  PREMIUM_PRICE_PESEWAS,
  PRO_PRICE_PESEWAS,
  sponsorPackage,
} from "@/lib/monetization"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * How long one plan payment buys, counted from the moment it was paid.
 * Subscriptions renew on the same date each month (at most 31 days later,
 * possibly later in the day), so a month plus a day never leaves a gap.
 */
export const PLAN_DAYS = 32

const PLAN_NAMES: Record<PaidPlan, string> = {
  premium: "Lincoln Navigation Premium (monthly)",
  pro: "Lincoln Navigation Pro (monthly)",
}
const PLAN_PRICES: Record<PaidPlan, number> = {
  premium: PREMIUM_PRICE_PESEWAS,
  pro: PRO_PRICE_PESEWAS,
}
/** Optional: pin the Paystack plan codes instead of finding them by name. */
const PLAN_CODE_ENV: Record<PaidPlan, string | undefined> = {
  premium: process.env.PAYSTACK_PLAN_PREMIUM?.trim() || undefined,
  pro: process.env.PAYSTACK_PLAN_PRO?.trim() || undefined,
}

/** A Paystack plan as it appears on a transaction or subscription. */
export interface PaystackPlanRef {
  plan_code?: string
  name?: string
}

/** The fields we use from a Paystack transaction (verify API or webhook). */
export interface PaystackTx {
  reference?: string
  status?: string
  amount?: number
  currency?: string
  paid_at?: string | null
  customer?: { email?: string }
  /**
   * Set on subscription charges (first and renewals): an object in webhooks
   * (`{}` when not a plan), possibly just the plan code from the verify API,
   * which then also sends `plan_object`.
   */
  plan?: PaystackPlanRef | string | null
  plan_object?: PaystackPlanRef | null
  metadata?: {
    plan?: string
    user_id?: string
    sponsor_id?: string
    package?: string
  } | null
}

/** Look a transaction up with Paystack. null if it can't be confirmed. */
export async function fetchTransaction(reference: string, secret: string): Promise<PaystackTx | null> {
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15000) },
    )
    const data = res.ok ? ((await res.json()) as { status?: boolean; data?: PaystackTx }) : null
    return data?.status && data.data ? data.data : null
  } catch {
    // Paystack unreachable, or answered with something that isn't JSON.
    return null
  }
}

/** Paystack signs each webhook body with HMAC-SHA512 of the secret key. */
export function isValidWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex")
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(signature, "utf8")
  return a.length === b.length && timingSafeEqual(a, b)
}

export type PlanPayment =
  | { ok: true; plan: PaidPlan; email: string; paidAtMs: number; expiresAtSec: number; renews: boolean }
  | { ok: false; reason: "payment-not-confirmed" | "payment-not-a-plan" | "payment-expired" }

/**
 * What plan a transaction pays for — the plan tag we set at checkout (or, on
 * a renewal, our Paystack plan) AND an amount that covers that plan's price,
 * in our currency. Any other successful transaction on the account (a test
 * charge, another product) is not a plan.
 */
export function planPayment(tx: PaystackTx): PlanPayment {
  if (tx.status !== "success") return { ok: false, reason: "payment-not-confirmed" }

  // Renewal charges don't carry our checkout metadata, only the Paystack plan.
  const paid = tx.amount ?? 0
  const tag = tx.metadata?.plan
  const ref = txPlan(tx)
  const subPlan = planForPaystackPlan(ref)
  let plan: PaidPlan | null = null
  if (tx.currency === PREMIUM_CURRENCY) {
    if ((tag === "pro_monthly" || subPlan === "pro") && paid >= PRO_PRICE_PESEWAS) plan = "pro"
    else if ((tag === "premium_monthly" || subPlan === "premium") && paid >= PREMIUM_PRICE_PESEWAS) plan = "premium"
  }
  if (!plan) return { ok: false, reason: "payment-not-a-plan" }

  // A payment buys PLAN_DAYS from when it was paid, not from when it is
  // checked — otherwise the same reference could be re-verified every month.
  const paidAtMs = tx.paid_at ? Date.parse(tx.paid_at) : NaN
  if (!Number.isFinite(paidAtMs)) return { ok: false, reason: "payment-not-confirmed" }
  const expiresAtSec = Math.floor(paidAtMs / 1000) + PLAN_DAYS * 24 * 60 * 60
  if (expiresAtSec <= Math.floor(Date.now() / 1000)) return { ok: false, reason: "payment-expired" }

  return {
    ok: true,
    plan,
    email: tx.customer?.email || "unknown",
    paidAtMs,
    expiresAtSec,
    renews: Boolean(ref?.plan_code),
  }
}

/** The Paystack plan a transaction was charged on, whichever shape it came in. */
export function txPlan(tx: PaystackTx): PaystackPlanRef | null {
  if (typeof tx.plan === "string") return { ...tx.plan_object, plan_code: tx.plan }
  if (tx.plan?.plan_code) return tx.plan
  return tx.plan_object?.plan_code ? tx.plan_object : null
}

/** Which of our plans a Paystack plan is, by pinned code or by our plan name. */
export function planForPaystackPlan(ref: PaystackPlanRef | null | undefined): PaidPlan | null {
  if (!ref) return null
  for (const plan of ["pro", "premium"] as const) {
    if (ref.plan_code && ref.plan_code === PLAN_CODE_ENV[plan]) return plan
    if (ref.name && ref.name === PLAN_NAMES[plan]) return plan
  }
  return null
}

const planCodeCache = new Map<string, string>()

/**
 * The Paystack plan code for a monthly Premium / Pro subscription at today's
 * price: PAYSTACK_PLAN_PREMIUM / _PRO if set, otherwise our named plan with
 * this amount, created on first use. A price change gets a new plan, so
 * existing subscribers keep the price they signed up at.
 */
export async function getPlanCode(plan: PaidPlan, secret: string): Promise<string | null> {
  const pinned = PLAN_CODE_ENV[plan]
  if (pinned) return pinned
  const amount = PLAN_PRICES[plan]
  const key = `${plan}:${amount}`
  const cached = planCodeCache.get(key)
  if (cached) return cached

  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }
  try {
    const res = await fetch(`https://api.paystack.co/plan?perPage=100&interval=monthly&amount=${amount}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const list = (await res.json()) as {
      data?: { plan_code: string; name: string; amount: number; currency: string; is_archived?: boolean; is_deleted?: boolean }[]
    }
    const found = list.data?.find(
      (p) =>
        p.name === PLAN_NAMES[plan] &&
        p.amount === amount &&
        p.currency === PREMIUM_CURRENCY &&
        !p.is_archived &&
        !p.is_deleted,
    )
    let code = found?.plan_code
    if (!code) {
      const created = await fetch("https://api.paystack.co/plan", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: PLAN_NAMES[plan], interval: "monthly", amount, currency: PREMIUM_CURRENCY }),
        signal: AbortSignal.timeout(15000),
      })
      const made = created.ok ? ((await created.json()) as { data?: { plan_code?: string } }) : null
      code = made?.data?.plan_code
    }
    if (!code) return null
    planCodeCache.set(key, code)
    return code
  } catch {
    return null
  }
}

/** Stop a subscription renewing. The period already paid for is unaffected. */
export async function disableSubscription(code: string, emailToken: string, secret: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.paystack.co/subscription/disable", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code, token: emailToken }),
      signal: AbortSignal.timeout(15000),
    })
    const data = (await res.json().catch(() => null)) as { status?: boolean; message?: string } | null
    // Already off counts as done.
    return Boolean(data?.status) || /already|not active/i.test(data?.message ?? "")
  } catch {
    return false
  }
}

/** Paystack's hosted page where the customer can change card or cancel. */
export async function subscriptionManageLink(code: string, secret: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.paystack.co/subscription/${encodeURIComponent(code)}/manage/link`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15000),
    })
    const data = res.ok ? ((await res.json()) as { data?: { link?: string } }) : null
    return data?.data?.link ?? null
  } catch {
    return null
  }
}

/**
 * Mark a sponsored listing paid (status → pending_review) if the transaction
 * covers its package. Only a listing still waiting for this exact payment
 * moves on, so a repeat (browser return + webhook, or a Paystack retry) is a
 * harmless no-op and can't reset one that's already live or ended.
 * Needs the service-role client (ADMIN_ENABLED).
 */
export async function markSponsorPaid(
  tx: PaystackTx,
  reference: string,
): Promise<"ok" | "not-a-listing" | "error"> {
  if (tx.status !== "success") return "not-a-listing"
  const sponsorId = tx.metadata?.sponsor_id
  const pkg = sponsorPackage(tx.metadata?.package ?? "")
  if (!sponsorId || !pkg || tx.currency !== PREMIUM_CURRENCY || (tx.amount ?? 0) < pkg.pricePesewas) {
    return "not-a-listing"
  }

  const { error } = await createAdminClient()
    .from("sponsors")
    .update({
      status: "pending_review",
      paid_at: tx.paid_at ?? new Date().toISOString(),
      amount_pesewas: tx.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sponsorId)
    .eq("paystack_reference", reference)
    .eq("status", "awaiting_payment")
  if (error) {
    console.error("[sponsor] could not mark paid:", error.message)
    return "error"
  }
  return "ok"
}
