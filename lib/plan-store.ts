// lib/plan-store.ts  (server only)
//
// Plan payments recorded in Supabase (see 0005_plan_purchases.sql), so a paid
// plan can be restored on another device. The signed cookie is still what the
// rest of the app checks; this table is how a customer gets one back.

import type { PaidPlan } from "@/lib/premium-cookie"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

export interface PurchaseRow {
  reference: string
  plan: PaidPlan
  email: string
  user_id: string | null
  paid_at: string
  expires_at: string
}

const COLUMNS = "reference, plan, email, user_id, paid_at, expires_at"

/**
 * Remember a verified payment. Never throws: recording is best effort.
 * Returns false only if Supabase is set up but the write failed, so the
 * webhook can ask Paystack to retry.
 */
export async function recordPurchase(input: {
  reference: string
  plan: PaidPlan
  email: string
  userId: string | null
  paidAtMs: number
  expiresAtSec: number
  /** Details for the payment history (0010_plan_purchase_details.sql). */
  kind?: "monthly" | "renewal" | "once"
  amountPesewas?: number
  currency?: string
  channel?: string | null
}): Promise<boolean> {
  if (!ADMIN_ENABLED) return true
  try {
    const { error } = await createAdminClient()
      .from("plan_purchases")
      .upsert(
        {
          reference: input.reference,
          plan: input.plan,
          email: input.email.toLowerCase(),
          // Keep an existing link if this is a repeat verify by a signed-out visitor.
          ...(input.userId ? { user_id: input.userId } : {}),
          paid_at: new Date(input.paidAtMs).toISOString(),
          expires_at: new Date(input.expiresAtSec * 1000).toISOString(),
          ...(input.kind ? { kind: input.kind } : {}),
          ...(input.amountPesewas ? { amount_pesewas: input.amountPesewas } : {}),
          ...(input.currency ? { currency: input.currency } : {}),
          ...(input.channel ? { channel: input.channel } : {}),
        },
        { onConflict: "reference" }
      )
    if (error) {
      console.error("[plans] could not record purchase:", error.message)
      return false
    }
    return true
  } catch (error) {
    console.error("[plans] could not record purchase:", error)
    return false
  }
}

/** Pro beats Premium; within a plan the one that lasts longest wins. */
function best(rows: PurchaseRow[]): PurchaseRow | null {
  const now = Date.now()
  const live = rows.filter((r) => Date.parse(r.expires_at) > now)
  live.sort(
    (a, b) =>
      (b.plan === "pro" ? 1 : 0) - (a.plan === "pro" ? 1 : 0) ||
      Date.parse(b.expires_at) - Date.parse(a.expires_at)
  )
  return live[0] ?? null
}

/**
 * The plan a signed-in user is entitled to: payments already linked to their
 * account, payments made with their (verified) sign-in email, and, if they
 * give one, a specific payment reference from their receipt. Anything found
 * is linked to the account so it follows them from now on.
 */
export async function findEntitlement(user: { id: string; email?: string | null }, reference?: string | null) {
  if (!ADMIN_ENABLED) return null
  const admin = createAdminClient()

  const found: PurchaseRow[] = []
  const byUser = await admin.from("plan_purchases").select(COLUMNS).eq("user_id", user.id)
  found.push(...((byUser.data as PurchaseRow[] | null) ?? []))

  if (user.email) {
    const byEmail = await admin.from("plan_purchases").select(COLUMNS).eq("email", user.email.toLowerCase())
    found.push(...((byEmail.data as PurchaseRow[] | null) ?? []))
  }

  if (reference) {
    const byRef = await admin.from("plan_purchases").select(COLUMNS).eq("reference", reference.trim()).maybeSingle()
    if (byRef.data) found.push(byRef.data as PurchaseRow)
  }

  const winner = best(found)
  if (!winner) return null

  // Link the payments we matched that aren't tied to anyone yet. A payment
  // already linked to another account stays with that account.
  const toLink = found.filter((r) => r.user_id === null).map((r) => r.reference)
  if (toLink.length > 0) {
    await admin.from("plan_purchases").update({ user_id: user.id }).in("reference", toLink)
  }
  return winner
}

// ---------------------------------------------------------------------------
// Subscriptions (0008_plan_subscriptions.sql). Kept in step with Paystack by
// the webhook; used by /account to show renewal and to cancel / change card.

export type SubscriptionStatus = "active" | "non-renewing" | "attention" | "completed" | "cancelled" | string

export interface SubscriptionRow {
  subscription_code: string
  email_token: string | null
  customer_code: string | null
  plan: PaidPlan
  email: string
  user_id: string | null
  status: SubscriptionStatus
  next_payment_at: string | null
  card_brand: string | null
  card_last4: string | null
  updated_at: string
}

const SUB_COLUMNS =
  "subscription_code, email_token, customer_code, plan, email, user_id, status, next_payment_at, card_brand, card_last4, updated_at"

/** Still charging (or about to retry after a failed charge). */
export const RENEWING: SubscriptionStatus[] = ["active", "attention"]

/** The account a Paystack email has paid from before, if any. */
async function userIdForEmail(email: string): Promise<string | null> {
  const admin = createAdminClient()
  const lower = email.toLowerCase()
  const sub = await admin
    .from("plan_subscriptions")
    .select("user_id")
    .eq("email", lower)
    .not("user_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (sub.data?.user_id) return sub.data.user_id as string
  const paid = await admin
    .from("plan_purchases")
    .select("user_id")
    .eq("email", lower)
    .not("user_id", "is", null)
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (paid.data?.user_id as string | undefined) ?? null
}

/** The account linked to earlier payments from this email (renewals carry no metadata). */
export async function accountForEmail(email: string): Promise<string | null> {
  if (!ADMIN_ENABLED) return null
  try {
    return await userIdForEmail(email)
  } catch {
    return null
  }
}

/** Create or refresh a subscription from a Paystack subscription event. */
export async function upsertSubscription(sub: {
  code: string
  emailToken?: string | null
  customerCode?: string | null
  plan: PaidPlan
  email: string
  status: string
  nextPaymentAt?: string | null
  cardBrand?: string | null
  cardLast4?: string | null
}): Promise<boolean> {
  if (!ADMIN_ENABLED) return true
  try {
    const userId = await userIdForEmail(sub.email)
    const { error } = await createAdminClient()
      .from("plan_subscriptions")
      .upsert(
        {
          subscription_code: sub.code,
          plan: sub.plan,
          email: sub.email.toLowerCase(),
          status: sub.status,
          ...(sub.emailToken ? { email_token: sub.emailToken } : {}),
          ...(sub.customerCode ? { customer_code: sub.customerCode } : {}),
          ...(sub.nextPaymentAt !== undefined ? { next_payment_at: sub.nextPaymentAt } : {}),
          ...(sub.cardBrand ? { card_brand: sub.cardBrand } : {}),
          ...(sub.cardLast4 ? { card_last4: sub.cardLast4 } : {}),
          ...(userId ? { user_id: userId } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "subscription_code" },
      )
    if (error) {
      console.error("[plans] could not save subscription:", error.message)
      return false
    }
    return true
  } catch (error) {
    console.error("[plans] could not save subscription:", error)
    return false
  }
}

/** Update a known subscription (invoice events, cancel). No row = nothing to do. */
export async function updateSubscription(
  code: string,
  fields: { status?: string; next_payment_at?: string | null },
): Promise<boolean> {
  if (!ADMIN_ENABLED) return true
  try {
    const { error } = await createAdminClient()
      .from("plan_subscriptions")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("subscription_code", code)
    if (error) {
      console.error("[plans] could not update subscription:", error.message)
      return false
    }
    return true
  } catch (error) {
    console.error("[plans] could not update subscription:", error)
    return false
  }
}

/** Tie a buyer's unlinked subscriptions to their account (first charge carries user_id). */
export async function linkSubscriptions(email: string, userId: string): Promise<void> {
  if (!ADMIN_ENABLED) return
  try {
    await createAdminClient()
      .from("plan_subscriptions")
      .update({ user_id: userId })
      .eq("email", email.toLowerCase())
      .is("user_id", null)
  } catch {}
}

/** Every subscription for this account or its sign-in email, newest first. */
export async function listSubscriptions(user: { id: string; email?: string | null }): Promise<SubscriptionRow[]> {
  if (!ADMIN_ENABLED) return []
  const admin = createAdminClient()
  const rows: SubscriptionRow[] = []
  const byUser = await admin.from("plan_subscriptions").select(SUB_COLUMNS).eq("user_id", user.id)
  rows.push(...((byUser.data as SubscriptionRow[] | null) ?? []))
  if (user.email) {
    const byEmail = await admin
      .from("plan_subscriptions")
      .select(SUB_COLUMNS)
      .eq("email", user.email.toLowerCase())
      .is("user_id", null)
    const unlinked = (byEmail.data as SubscriptionRow[] | null) ?? []
    if (unlinked.length > 0) {
      await admin
        .from("plan_subscriptions")
        .update({ user_id: user.id })
        .in("subscription_code", unlinked.map((r) => r.subscription_code))
      rows.push(...unlinked)
    }
  }
  return rows.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
}

/**
 * The subscription to show on /account: one that is still renewing (Pro
 * first), otherwise the most recent one.
 */
export async function currentSubscription(user: { id: string; email?: string | null }): Promise<SubscriptionRow | null> {
  const rows = await listSubscriptions(user)
  const renewing = rows.filter((r) => RENEWING.includes(r.status))
  renewing.sort((a, b) => (b.plan === "pro" ? 1 : 0) - (a.plan === "pro" ? 1 : 0))
  return renewing[0] ?? rows[0] ?? null
}

/** Still-renewing subscriptions on this email, other than `exceptCode`. */
export async function otherRenewingSubscriptions(email: string, exceptCode: string): Promise<SubscriptionRow[]> {
  if (!ADMIN_ENABLED) return []
  const { data } = await createAdminClient()
    .from("plan_subscriptions")
    .select(SUB_COLUMNS)
    .eq("email", email.toLowerCase())
    .in("status", RENEWING)
    .neq("subscription_code", exceptCode)
  return (data as SubscriptionRow[] | null) ?? []
}

/** One subscription by its Paystack code. */
export async function getSubscription(code: string): Promise<SubscriptionRow | null> {
  if (!ADMIN_ENABLED) return null
  const { data } = await createAdminClient()
    .from("plan_subscriptions")
    .select(SUB_COLUMNS)
    .eq("subscription_code", code)
    .maybeSingle()
  return (data as SubscriptionRow | null) ?? null
}

/** When the latest payment from this email stops covering a plan. */
export async function paidUntil(email: string): Promise<Date | null> {
  if (!ADMIN_ENABLED) return null
  const { data } = await createAdminClient()
    .from("plan_purchases")
    .select("expires_at")
    .eq("email", email.toLowerCase())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.expires_at ? new Date(data.expires_at as string) : null
}

/**
 * End of a pay-once purchase: ONCE_DAYS from when it was paid, or — if the
 * customer paid early — from the end of the same plan they already had, so
 * no days are lost. Excludes this payment itself, so the webhook and the
 * browser return compute the same date.
 */
export async function onceExpiresAt(input: {
  email: string
  plan: PaidPlan
  reference: string
  paidAtMs: number
  days: number
}): Promise<number> {
  const fromPaid = Math.floor(input.paidAtMs / 1000) + input.days * 86_400
  if (!ADMIN_ENABLED) return fromPaid
  try {
    const { data } = await createAdminClient()
      .from("plan_purchases")
      .select("expires_at")
      .eq("email", input.email.toLowerCase())
      .eq("plan", input.plan)
      .neq("reference", input.reference)
      .gt("expires_at", new Date(input.paidAtMs).toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data?.expires_at) return fromPaid
    return Math.floor(Date.parse(data.expires_at as string) / 1000) + input.days * 86_400
  } catch {
    return fromPaid
  }
}

export interface PaymentHistoryRow {
  reference: string
  plan: PaidPlan
  kind: "monthly" | "renewal" | "once" | null
  amount_pesewas: number | null
  currency: string | null
  channel: string | null
  paid_at: string
  expires_at: string
}

/** A signed-in user's Premium / Pro payments, newest first (theirs by account or sign-in email). */
export async function paymentHistory(user: { id: string; email?: string | null }, limit = 50): Promise<PaymentHistoryRow[]> {
  if (!ADMIN_ENABLED) return []
  const cols = "reference, plan, kind, amount_pesewas, currency, channel, paid_at, expires_at"
  const admin = createAdminClient()
  const [byUser, byEmail] = await Promise.all([
    admin.from("plan_purchases").select(cols).eq("user_id", user.id),
    user.email
      ? admin.from("plan_purchases").select(cols).eq("email", user.email.toLowerCase()).is("user_id", null)
      : Promise.resolve({ data: [] as PaymentHistoryRow[] }),
  ])
  const rows = new Map<string, PaymentHistoryRow>()
  for (const r of [...((byUser.data as PaymentHistoryRow[] | null) ?? []), ...((byEmail.data as PaymentHistoryRow[] | null) ?? [])]) {
    rows.set(r.reference, r)
  }
  return [...rows.values()].sort((a, b) => Date.parse(b.paid_at) - Date.parse(a.paid_at)).slice(0, limit)
}
