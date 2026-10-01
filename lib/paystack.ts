// lib/paystack.ts  (server only)
//
// What a successful Paystack transaction buys, decided in one place so the
// browser return (/api/billing/verify, /api/sponsor/verify) and the webhook
// (/api/paystack/webhook) always agree.

import { createHmac, timingSafeEqual } from "node:crypto"
import type { PaidPlan } from "@/lib/premium-cookie"
import {
  PREMIUM_CURRENCY,
  PREMIUM_PRICE_PESEWAS,
  PRO_PRICE_PESEWAS,
  sponsorPackage,
} from "@/lib/monetization"
import { createAdminClient } from "@/lib/supabase/admin"

/** How long one plan payment buys, counted from the moment it was paid. */
export const PLAN_DAYS = 31

/** The fields we use from a Paystack transaction (verify API or webhook). */
export interface PaystackTx {
  reference?: string
  status?: string
  amount?: number
  currency?: string
  paid_at?: string | null
  customer?: { email?: string }
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
  | { ok: true; plan: PaidPlan; email: string; paidAtMs: number; expiresAtSec: number }
  | { ok: false; reason: "payment-not-confirmed" | "payment-not-a-plan" | "payment-expired" }

/**
 * What plan a transaction pays for — the plan tag we set at checkout AND an
 * amount that covers that plan's price, in our currency. Any other successful
 * transaction on the account (a test charge, another product) is not a plan.
 */
export function planPayment(tx: PaystackTx): PlanPayment {
  if (tx.status !== "success") return { ok: false, reason: "payment-not-confirmed" }

  const paid = tx.amount ?? 0
  const tag = tx.metadata?.plan
  let plan: PaidPlan | null = null
  if (tx.currency === PREMIUM_CURRENCY) {
    if (tag === "pro_monthly" && paid >= PRO_PRICE_PESEWAS) plan = "pro"
    else if (tag === "premium_monthly" && paid >= PREMIUM_PRICE_PESEWAS) plan = "premium"
  }
  if (!plan) return { ok: false, reason: "payment-not-a-plan" }

  // A payment buys PLAN_DAYS from when it was paid, not from when it is
  // checked — otherwise the same reference could be re-verified every month.
  const paidAtMs = tx.paid_at ? Date.parse(tx.paid_at) : NaN
  if (!Number.isFinite(paidAtMs)) return { ok: false, reason: "payment-not-confirmed" }
  const expiresAtSec = Math.floor(paidAtMs / 1000) + PLAN_DAYS * 24 * 60 * 60
  if (expiresAtSec <= Math.floor(Date.now() / 1000)) return { ok: false, reason: "payment-expired" }

  return { ok: true, plan, email: tx.customer?.email || "unknown", paidAtMs, expiresAtSec }
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
