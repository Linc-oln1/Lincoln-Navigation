// app/api/account/delete/route.ts
//
// Permanently deletes the signed-in user's account. Both app stores require
// in-app account deletion (also linked from /delete-account for Google Play).
//
//   POST { confirm: "DELETE" } → { deleted: true }
//
// Stops every renewing Paystack subscription first so nobody is charged for
// an account that no longer exists. Deleting the auth user cascades to
// profiles, saved places, recent searches and fleet vehicles; payment rows
// keep their receipt but lose the user link (on delete set null).
//
// Requires env: SUPABASE_SERVICE_ROLE_KEY (and PAYSTACK_SECRET_KEY to stop
// subscriptions)

import { NextResponse } from "next/server"
import { disableSubscription } from "@/lib/paystack"
import { listSubscriptions, RENEWING, updateSubscription } from "@/lib/plan-store"
import { PREMIUM_COOKIE_NAME } from "@/lib/premium-cookie"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import { createClient, getSessionUser } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "sign_in_required" }, { status: 401 })
  if (!ADMIN_ENABLED) {
    return NextResponse.json({ error: "Account deletion is not configured." }, { status: 501 })
  }

  let confirm = ""
  try {
    confirm = String(((await req.json()) as { confirm?: unknown }).confirm ?? "")
  } catch {}
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Confirmation missing." }, { status: 400 })
  }

  // Stop renewals. If one can't be stopped, don't delete — the account page
  // is where the user (or we) can still cancel it.
  const subs = await listSubscriptions(user).catch(() => [])
  const renewing = subs.filter((s) => RENEWING.includes(s.status))
  if (renewing.length > 0) {
    const secret = process.env.PAYSTACK_SECRET_KEY
    for (const sub of renewing) {
      const stopped =
        Boolean(secret && sub.email_token) &&
        (await disableSubscription(sub.subscription_code, sub.email_token!, secret!))
      if (!stopped) {
        return NextResponse.json(
          { error: "Couldn't stop your renewing plan. Cancel it on this page first, then try again." },
          { status: 502 },
        )
      }
      await updateSubscription(sub.subscription_code, { status: "cancelled", next_payment_at: null })
    }
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id)
  if (error) {
    console.error("[account/delete]", error.message)
    return NextResponse.json({ error: "Couldn't delete your account right now." }, { status: 500 })
  }

  // Clear the now-orphaned session and plan cookies on this device.
  try {
    await (await createClient()).auth.signOut()
  } catch {}
  const response = NextResponse.json({ deleted: true })
  response.cookies.set(PREMIUM_COOKIE_NAME, "", { path: "/", maxAge: 0 })
  return response
}
