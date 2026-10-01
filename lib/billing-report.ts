// lib/billing-report.ts  (server only)
//
// Everything /admin/billing shows, gathered in one place:
//   - subscriptions from plan_subscriptions (+ when each one's paid period
//     ends, from plan_purchases)
//   - payments straight from Paystack (exact amounts, every product): the
//     last 31 days, and this calendar month for the "collected" total
// Revenue figures for recurring plans use today's prices.

import { PREMIUM_CURRENCY, PREMIUM_PRICE_PESEWAS, PRO_PRICE_PESEWAS } from "@/lib/monetization"
import { planForPaystackPlan, txPlan, type PaystackTx } from "@/lib/paystack"
import { RENEWING, type SubscriptionRow } from "@/lib/plan-store"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

const DAY_MS = 86_400_000

export type PaymentKind = "Premium" | "Pro" | "Premium renewal" | "Pro renewal" | "Sponsored listing" | "Listing renewal" | "Other"

export interface Payment {
  reference: string
  paidAt: string
  email: string
  kind: PaymentKind
  /** e.g. the sponsor's business name. */
  detail: string | null
  amountPesewas: number
  currency: string
  channel: string | null
}

export interface Subscriber extends Omit<SubscriptionRow, "email_token"> {
  /** When the latest payment from this email stops covering the plan. */
  paidUntil: string | null
  created_at: string
}

export interface BillingReport {
  subscribers: Subscriber[]
  renewingPremium: number
  renewingPro: number
  /** Renewing subscriptions × today's price, per month. */
  monthlyRecurringPesewas: number
  failed: Subscriber[]
  /** Cancelled or not renewing, but still inside a paid period. */
  cancelling: Subscriber[]
  payments: Payment[] | null
  collectedThisMonth: { plans: number; listings: number; other: number } | null
  paystackError: string | null
}

interface RawTx extends Omit<PaystackTx, "metadata"> {
  channel?: string
  metadata?: PaystackTx["metadata"] | string | null
}

function metadataOf(tx: RawTx): NonNullable<PaystackTx["metadata"]> {
  if (!tx.metadata) return {}
  if (typeof tx.metadata === "string") {
    try {
      return JSON.parse(tx.metadata) ?? {}
    } catch {
      return {}
    }
  }
  return tx.metadata
}

function classify(tx: RawTx, meta: NonNullable<PaystackTx["metadata"]>): PaymentKind {
  if (meta.sponsor_id) return meta.kind === "renewal" ? "Listing renewal" : "Sponsored listing"
  if (meta.plan === "pro_monthly") return "Pro"
  if (meta.plan === "premium_monthly") return "Premium"
  // Monthly renewals carry no checkout metadata, only our Paystack plan.
  const plan = planForPaystackPlan(txPlan({ ...tx, metadata: meta }))
  if (plan === "pro") return "Pro renewal"
  if (plan === "premium") return "Premium renewal"
  return "Other"
}

/** Successful Paystack payments since `from`, newest first (up to 300). */
async function fetchPayments(from: Date, secret: string): Promise<RawTx[]> {
  const out: RawTx[] = []
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(
      `https://api.paystack.co/transaction?status=success&perPage=100&page=${page}&from=${encodeURIComponent(from.toISOString())}`,
      { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15000), cache: "no-store" },
    )
    if (!res.ok) throw new Error(`Paystack answered ${res.status}`)
    const body = (await res.json()) as { data?: RawTx[]; meta?: { pageCount?: number } }
    out.push(...(body.data ?? []))
    if (!body.meta?.pageCount || page >= body.meta.pageCount) break
  }
  return out
}

export async function getBillingReport(): Promise<BillingReport> {
  const now = Date.now()
  const report: BillingReport = {
    subscribers: [],
    renewingPremium: 0,
    renewingPro: 0,
    monthlyRecurringPesewas: 0,
    failed: [],
    cancelling: [],
    payments: null,
    collectedThisMonth: null,
    paystackError: null,
  }

  if (ADMIN_ENABLED) {
    const db = createAdminClient()
    const [{ data: subs }, { data: purchases }] = await Promise.all([
      db
        .from("plan_subscriptions")
        .select("subscription_code, customer_code, plan, email, user_id, status, next_payment_at, card_brand, card_last4, created_at, updated_at")
        .order("created_at", { ascending: false }),
      db.from("plan_purchases").select("email, expires_at"),
    ])
    const paidUntil = new Map<string, string>()
    for (const p of purchases ?? []) {
      const prev = paidUntil.get(p.email)
      if (!prev || Date.parse(p.expires_at) > Date.parse(prev)) paidUntil.set(p.email, p.expires_at)
    }
    report.subscribers = ((subs ?? []) as Subscriber[]).map((s) => ({ ...s, paidUntil: paidUntil.get(s.email) ?? null }))

    for (const s of report.subscribers) {
      if (RENEWING.includes(s.status)) {
        if (s.plan === "pro") report.renewingPro++
        else report.renewingPremium++
        report.monthlyRecurringPesewas += s.plan === "pro" ? PRO_PRICE_PESEWAS : PREMIUM_PRICE_PESEWAS
      }
      if (s.status === "attention") report.failed.push(s)
      else if (!RENEWING.includes(s.status) && s.paidUntil && Date.parse(s.paidUntil) > now) report.cancelling.push(s)
    }
  }

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    report.paystackError = "PAYSTACK_SECRET_KEY isn't set here."
    return report
  }

  const nowDate = new Date(now)
  const monthStart = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1)) // Accra is UTC
  const recentStart = new Date(now - 31 * DAY_MS)
  try {
    const raw = await fetchPayments(monthStart < recentStart ? monthStart : recentStart, secret)

    // Sponsor names for listing payments.
    const sponsorIds = [...new Set(raw.map((tx) => metadataOf(tx).sponsor_id).filter(Boolean))] as string[]
    const names = new Map<string, string>()
    if (sponsorIds.length && ADMIN_ENABLED) {
      const { data } = await createAdminClient().from("sponsors").select("id, name").in("id", sponsorIds)
      for (const s of data ?? []) names.set(s.id, s.name)
    }

    const payments: Payment[] = raw.map((tx) => {
      const meta = metadataOf(tx)
      return {
        reference: tx.reference ?? "",
        paidAt: tx.paid_at ?? "",
        email: tx.customer?.email ?? "",
        kind: classify(tx, meta),
        detail: meta.sponsor_id ? (names.get(meta.sponsor_id) ?? null) : null,
        amountPesewas: tx.amount ?? 0,
        currency: tx.currency ?? PREMIUM_CURRENCY,
        channel: tx.channel ?? null,
      }
    })
    payments.sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt))

    const collected = { plans: 0, listings: 0, other: 0 }
    for (const p of payments) {
      if (Date.parse(p.paidAt) < monthStart.getTime() || p.currency !== PREMIUM_CURRENCY) continue
      if (p.kind === "Sponsored listing" || p.kind === "Listing renewal") collected.listings += p.amountPesewas
      else if (p.kind === "Other") collected.other += p.amountPesewas
      else collected.plans += p.amountPesewas
    }
    report.collectedThisMonth = collected
    report.payments = payments.filter((p) => Date.parse(p.paidAt) >= recentStart.getTime())
  } catch (error) {
    console.error("[billing report] Paystack:", error)
    report.paystackError = "Couldn't load payments from Paystack right now."
  }
  return report
}
