// lib/referral-rewards.ts  (server only)
//
// Referral reward: 7 days of Pro for the friend and for whoever referred
// them, once the friend's email is confirmed (0012_referral_rewards.sql).
// Granting is idempotent: the unique (user_id, referred_user) row is
// inserted first, and only a fresh insert extends profiles.pro_until.

import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

export const REWARD_DAYS = 7
/** Most friends who can earn a referrer a reward. */
export const MAX_REFERRER_REWARDS = 10

type Admin = ReturnType<typeof createAdminClient>

async function grant(admin: Admin, userId: string, referredUser: string, role: "referrer" | "friend") {
  const { error } = await admin
    .from("referral_rewards")
    .insert({ user_id: userId, referred_user: referredUser, role, days: REWARD_DAYS })
  if (error) return false // already granted (unique) or failed — either way, don't extend

  const { data } = await admin.from("profiles").select("pro_until").eq("id", userId).maybeSingle()
  const base = Math.max(Date.now(), data?.pro_until ? Date.parse(data.pro_until) : 0)
  await admin
    .from("profiles")
    .update({ pro_until: new Date(base + REWARD_DAYS * 86_400_000).toISOString() })
    .eq("id", userId)
  return true
}

async function confirmed(admin: Admin, userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId)
  return Boolean(data.user?.email_confirmed_at)
}

/**
 * Grant whatever rewards are due to this user: their own "friend" reward if
 * they were referred, and "referrer" rewards for friends who have confirmed.
 * Never throws.
 */
export async function grantReferralRewards(user: { id: string; email_confirmed_at?: string | null }) {
  if (!ADMIN_ENABLED) return
  try {
    const admin = createAdminClient()

    // As the friend: both sides are paid out the moment this user is confirmed.
    if (user.email_confirmed_at) {
      const { data: me } = await admin.from("profiles").select("referred_by").eq("id", user.id).maybeSingle()
      if (me?.referred_by) {
        await grant(admin, user.id, user.id, "friend")
        const { count } = await admin
          .from("referral_rewards")
          .select("id", { count: "exact", head: true })
          .eq("user_id", me.referred_by)
          .eq("role", "referrer")
        if ((count ?? 0) < MAX_REFERRER_REWARDS) await grant(admin, me.referred_by, user.id, "referrer")
      }
    }

    // As the referrer: friends who confirmed before the referrer came back.
    const [{ data: friends }, { data: paid }] = await Promise.all([
      admin.from("profiles").select("id").eq("referred_by", user.id),
      admin.from("referral_rewards").select("referred_user").eq("user_id", user.id).eq("role", "referrer"),
    ])
    const done = new Set((paid ?? []).map((r) => r.referred_user))
    let slots = MAX_REFERRER_REWARDS - done.size
    for (const f of friends ?? []) {
      if (slots <= 0) break
      if (done.has(f.id) || !(await confirmed(admin, f.id))) continue
      if (await grant(admin, user.id, f.id, "referrer")) slots--
    }
  } catch (e) {
    console.error("[referral] reward grant failed:", e)
  }
}

/** End of this user's free referral Pro time (unix seconds), or null if none/expired. */
export async function referralProUntil(userId: string): Promise<number | null> {
  if (!ADMIN_ENABLED) return null
  const { data } = await createAdminClient().from("profiles").select("pro_until").eq("id", userId).maybeSingle()
  const t = data?.pro_until ? Date.parse(data.pro_until) : 0
  return t > Date.now() ? Math.floor(t / 1000) : null
}
