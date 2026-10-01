// lib/plan-reminders.ts  (server only)
//
// Daily (from /api/cron/daily): email everyone whose Premium / Pro ends within
// REMIND_DAYS and won't renew by itself — pay-once customers, and subscribers
// who cancelled. Renewing subscriptions are skipped (they renew; a failed
// renewal has its own email). Each plan end is emailed once.

import { sendPlanEnding } from "@/lib/billing-emails"
import { RENEWING } from "@/lib/plan-store"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

const REMIND_DAYS = 3
const DAY_MS = 86_400_000

interface PurchaseRow {
  email: string
  plan: "premium" | "pro"
  user_id: string | null
  expires_at: string
}

export async function runPlanReminders(now = Date.now()) {
  const result = { endingSoon: 0, emailFailures: 0 }
  if (!ADMIN_ENABLED) return result
  const db = createAdminClient()

  // Every purchase still running; the latest one per email is when the plan ends.
  const [{ data: purchases }, { data: renewing }] = await Promise.all([
    db
      .from("plan_purchases")
      .select("email, plan, user_id, expires_at")
      .gt("expires_at", new Date(now).toISOString()),
    db.from("plan_subscriptions").select("email").in("status", RENEWING),
  ])
  const renews = new Set((renewing ?? []).map((r) => (r.email as string).toLowerCase()))

  const latest = new Map<string, PurchaseRow>()
  for (const p of (purchases ?? []) as PurchaseRow[]) {
    const email = p.email.toLowerCase()
    const prev = latest.get(email)
    if (!prev || Date.parse(p.expires_at) > Date.parse(prev.expires_at)) latest.set(email, p)
  }

  for (const [email, p] of latest) {
    if (renews.has(email) || email === "unknown") continue
    if (Date.parse(p.expires_at) - now > REMIND_DAYS * DAY_MS) continue
    result.endingSoon++
    if (!(await sendPlanEnding(p))) result.emailFailures++
  }
  return result
}
