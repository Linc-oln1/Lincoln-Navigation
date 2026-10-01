// app/api/billing/subscription/route.ts
//
// The signed-in user's Premium / Pro subscription, for /account.
//
//   GET                         → { subscription: {...} | null }
//   POST { action: "cancel" }   → stop renewing (the paid period stays);
//                                 re-mints the plan cookie without `renews`
//   POST { action: "manage" }   → { url } of Paystack's page to change card
//
// Requires env: PAYSTACK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

import { NextResponse } from "next/server"
import { disableSubscription, subscriptionManageLink } from "@/lib/paystack"
import { currentSubscription, updateSubscription } from "@/lib/plan-store"
import {
  mintPremiumCookie,
  planOf,
  PREMIUM_COOKIE_NAME,
  verifyPremiumCookie,
} from "@/lib/premium-cookie"
import { getSessionUser } from "@/lib/supabase/server"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "sign_in_required" }, { status: 401 })

  const sub = await currentSubscription(user).catch(() => null)
  return NextResponse.json({
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          nextPaymentAt: sub.next_payment_at,
          cardBrand: sub.card_brand,
          cardLast4: sub.card_last4,
        }
      : null,
  })
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "sign_in_required" }, { status: 401 })
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: "Billing is not configured." }, { status: 501 })

  let action = ""
  try {
    action = String(((await req.json()) as { action?: unknown }).action ?? "")
  } catch {}

  const sub = await currentSubscription(user).catch(() => null)
  if (!sub) return NextResponse.json({ error: "No subscription found." }, { status: 404 })

  if (action === "manage") {
    const url = await subscriptionManageLink(sub.subscription_code, secret)
    return url
      ? NextResponse.json({ url })
      : NextResponse.json({ error: "Couldn't open Paystack right now." }, { status: 502 })
  }

  if (action === "cancel") {
    if (!sub.email_token || !(await disableSubscription(sub.subscription_code, sub.email_token, secret))) {
      return NextResponse.json({ error: "Couldn't cancel right now." }, { status: 502 })
    }
    // Paystack also sends subscription.disable / not_renew to the webhook.
    await updateSubscription(sub.subscription_code, { status: "cancelled", next_payment_at: null })

    const response = NextResponse.json({ cancelled: true })
    // Same plan and end date, but no longer "renews", so the app says when it ends.
    const raw = req.headers
      .get("cookie")
      ?.split("; ")
      .find((c) => c.startsWith(`${PREMIUM_COOKIE_NAME}=`))
      ?.slice(PREMIUM_COOKIE_NAME.length + 1)
    const current = verifyPremiumCookie(raw ? decodeURIComponent(raw) : null)
    if (current) {
      const { value, maxAge } = mintPremiumCookie({
        email: current.sub,
        reference: current.ref,
        plan: planOf(current),
        expiresAt: current.exp,
      })
      response.cookies.set(PREMIUM_COOKIE_NAME, value, {
        maxAge,
        path: "/",
        sameSite: "lax",
        secure: new URL(req.url).protocol === "https:",
        httpOnly: false,
      })
    }
    return response
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 })
}
