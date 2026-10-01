// app/api/billing/checkout/route.ts
//
// Starts a monthly Premium / Pro subscription: a Paystack transaction on our
// Paystack plan (lib/paystack getPlanCode), card only — Paystack can only
// renew cards. Paystack then charges the same card every month until it's
// cancelled; the webhook records each charge. Returns the hosted-checkout
// URL; on completion Paystack sends the buyer to /api/billing/verify.
//
// Signed-in only, billed to the account's email, so renewals and the
// cancel / change-card controls on /account follow the account.
//
// Requires env: PAYSTACK_SECRET_KEY  (sk_...)
// Optional:     NEXT_PUBLIC_SITE_URL (defaults to the request origin)

import { NextResponse } from "next/server"
import {
  PREMIUM_CURRENCY,
  PREMIUM_PRICE_PESEWAS,
  PRO_PRICE_PESEWAS,
} from "@/lib/monetization"
import { getPlanCode } from "@/lib/paystack"
import { currentSubscription, RENEWING } from "@/lib/plan-store"
import { getSessionUser } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return NextResponse.json(
      { error: "Billing is not configured on this deployment." },
      { status: 501 },
    )
  }

  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 })
  }
  const email = (user.email || "").trim().toLowerCase()
  if (!email) {
    return NextResponse.json(
      { error: "Your account has no email address. Add one on your account page first." },
      { status: 400 },
    )
  }

  let plan: "premium" | "pro" = "premium"
  try {
    const body = (await req.json()) as { plan?: string }
    if (body.plan === "pro") plan = "pro"
  } catch {
    /* default to premium */
  }

  // Don't start a second subscription that would charge alongside one that's
  // still renewing. Moving Premium → Pro is allowed (the webhook then stops
  // the Premium one).
  const existing = await currentSubscription(user)
  if (existing && RENEWING.includes(existing.status) && (existing.plan === "pro" || existing.plan === plan)) {
    return NextResponse.json(
      { error: `You already have ${existing.plan === "pro" ? "Pro" : "Premium"}, renewing monthly. Manage it on your account page.` },
      { status: 409 },
    )
  }

  const planCode = await getPlanCode(plan, secret)
  if (!planCode) {
    return NextResponse.json({ error: "Could not start checkout. Try again in a minute." }, { status: 502 })
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      // Paystack charges the plan's amount; this is the same number.
      amount: plan === "pro" ? PRO_PRICE_PESEWAS : PREMIUM_PRICE_PESEWAS,
      currency: PREMIUM_CURRENCY,
      plan: planCode,
      channels: ["card"],
      callback_url: `${origin}/api/billing/verify`,
      metadata: {
        plan: plan === "pro" ? "pro_monthly" : "premium_monthly",
        product: "LincolnNavigation.com",
        // Lets the webhook link the payment even if the buyer never comes
        // back through /api/billing/verify.
        user_id: user.id,
      },
    }),
  }).catch(() => null)

  const data = res
    ? ((await res.json().catch(() => null)) as {
        status: boolean
        message: string
        data?: { authorization_url: string; reference: string }
      } | null)
    : null

  if (!res?.ok || !data?.status || !data.data) {
    return NextResponse.json(
      { error: data?.message || "Could not start checkout." },
      { status: 502 },
    )
  }

  return NextResponse.json({
    url: data.data.authorization_url,
    reference: data.data.reference,
  })
}
