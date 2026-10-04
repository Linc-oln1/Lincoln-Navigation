// lib/referral-rewards.ts  (server only)
//
// Referral reward: 7 days of Pro for the friend and for whoever referred
// them, once the friend's email is confirmed (0012_referral_rewards.sql).
// Granting is idempotent: the unique (user_id, referred_user) row is
// inserted first, and only a fresh insert extends profiles.pro_until.

import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

export const REWARD_DAYS = 7
/** Most friends who can earn a referrer a reward. */
export const MAX_REFERRER_REWARDS = 5

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

/**
 * One mailbox, one key: lowercase, drop "+tag", and for Gmail ignore dots
 * (and treat googlemail.com as gmail.com), so alias tricks map to one person.
 */
export function emailKey(email: string): string {
  const [rawLocal, rawDomain = ""] = email.trim().toLowerCase().split("@")
  const domain = rawDomain === "googlemail.com" ? "gmail.com" : rawDomain
  let local = rawLocal.split("+")[0]
  if (domain === "gmail.com") local = local.replace(/\./g, "")
  return `${local}@${domain}`
}

/**
 * Whether `friendId` may earn rewards: email confirmed, not the referrer's
 * own mailbox, and that mailbox hasn't already earned a reward for anyone
 * (claimed permanently, even if the account is later deleted).
 */
async function eligibleFriend(admin: Admin, friendId: string, referrerId: string) {
  const [{ data: f }, { data: r }] = await Promise.all([
    admin.auth.admin.getUserById(friendId),
    admin.auth.admin.getUserById(referrerId),
  ])
  const email = f.user?.email
  if (!f.user?.email_confirmed_at || !email) return false
  const key = emailKey(email)
  if (r.user?.email && emailKey(r.user.email) === key) return false

  const { error } = await admin.from("referral_email_claims").insert({ email_key: key, user_id: friendId })
  if (!error) return true
  const { data: existing } = await admin.from("referral_email_claims").select("user_id").eq("email_key", key).maybeSingle()
  return existing?.user_id === friendId
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
      if (me?.referred_by && (await eligibleFriend(admin, user.id, me.referred_by))) {
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
      if (done.has(f.id) || !(await eligibleFriend(admin, f.id, user.id))) continue
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
