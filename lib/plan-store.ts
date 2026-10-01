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
