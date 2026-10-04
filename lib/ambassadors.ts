// lib/ambassadors.ts  (server only)
//
// Promoter programme (0014_ambassadors.sql). A promoter's numbers come from
// the referral link they share:
//   users        = people who signed up with their code AND confirmed their email
//   subscribers  = those users who have paid for Premium or Pro at least once
//                  (a plan_purchases row, i.e. a Paystack-verified payment —
//                  free referral Pro days never create one)
//   earned       = GHS 1,000 for every full 50 subscribers
// Counting is by distinct person, so one friend paying every month is still one.

import { createAdminClient } from "@/lib/supabase/admin"

export const TARGET_USERS = 150
export const TARGET_SUBSCRIBERS = 50
export const PAY_BLOCK_SUBSCRIBERS = 50
export const PAY_PER_BLOCK_GHS = 1000

export interface AmbassadorStats {
  userId: string
  name: string | null
  email: string | null
  code: string
  signups: number
  users: number
  subscribers: number
  earnedGhs: number
  paidGhs: number
  owedGhs: number
}

type Admin = ReturnType<typeof createAdminClient>

export function earnedFor(subscribers: number): number {
  return Math.floor(subscribers / PAY_BLOCK_SUBSCRIBERS) * PAY_PER_BLOCK_GHS
}

async function emailOf(admin: Admin, id: string) {
  const { data } = await admin.auth.admin.getUserById(id)
  return { email: data.user?.email ?? null, confirmed: Boolean(data.user?.email_confirmed_at) }
}

export async function statsFor(admin: Admin, userId: string): Promise<AmbassadorStats | null> {
  const { data: p } = await admin
    .from("profiles")
    .select("id, display_name, referral_code, is_ambassador")
    .eq("id", userId)
    .maybeSingle()
  if (!p) return null

  const [{ data: friends }, { data: payouts }, me] = await Promise.all([
    admin.from("profiles").select("id").eq("referred_by", userId),
    admin.from("ambassador_payouts").select("amount_ghs").eq("user_id", userId),
    emailOf(admin, userId),
  ])
  const ids = (friends ?? []).map((f) => f.id as string)

  const confirmed = (await Promise.all(ids.map(async (id) => ((await emailOf(admin, id)).confirmed ? id : null)))).filter(
    (id): id is string => id !== null,
  )
  let subscribers = 0
  if (confirmed.length > 0) {
    const { data: paid } = await admin.from("plan_purchases").select("user_id").in("user_id", confirmed)
    subscribers = new Set((paid ?? []).map((r) => r.user_id)).size
  }

  const earnedGhs = earnedFor(subscribers)
  const paidGhs = (payouts ?? []).reduce((n, r) => n + (r.amount_ghs as number), 0)
  return {
    userId,
    name: p.display_name,
    email: me.email,
    code: p.referral_code,
    signups: ids.length,
    users: confirmed.length,
    subscribers,
    earnedGhs,
    paidGhs,
    owedGhs: Math.max(0, earnedGhs - paidGhs),
  }
}

export async function listAmbassadors(admin: Admin): Promise<AmbassadorStats[]> {
  const { data } = await admin.from("profiles").select("id").eq("is_ambassador", true)
  const all = await Promise.all((data ?? []).map((r) => statsFor(admin, r.id as string)))
  return all.filter((s): s is AmbassadorStats => s !== null).sort((a, b) => b.subscribers - a.subscribers)
}
