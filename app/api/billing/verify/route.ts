// app/api/billing/verify/route.ts
//
// Paystack redirects the visitor here after payment with
// ?reference=... We verify the transaction server-side, and on
// success set the signed "ln_premium" entitlement cookie and send
// the visitor to /pricing?welcome=1.
//
// Requires env: PAYSTACK_SECRET_KEY

import { NextResponse } from "next/server"
import {
  mintPremiumCookie,
  planOf,
  PREMIUM_COOKIE_NAME,
  verifyPremiumCookie,
} from "@/lib/premium-cookie"
import {
  PREMIUM_CURRENCY,
  PREMIUM_PRICE_PESEWAS,
  PRO_PRICE_PESEWAS,
} from "@/lib/monetization"

/** How long one payment buys, counted from the moment it was paid. */
const PLAN_DAYS = 31

export async function GET(req: Request) {
  const url = new URL(req.url)
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref")
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/pricing?error=${encodeURIComponent(reason)}`)

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return fail("billing-not-configured")
  if (!reference) return fail("missing-reference")

  let data: {
    status: boolean
    data?: {
      status: string
      amount?: number
      currency?: string
      paid_at?: string | null
      customer?: { email?: string }
      metadata?: { plan?: string } | null
    }
  } | null = null
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15000) },
    )
    data = res.ok ? await res.json() : null
  } catch {
    // Paystack unreachable, or answered with something that isn't JSON.
    return fail("payment-not-confirmed")
  }

  const tx = data?.data
  if (!data?.status || tx?.status !== "success") {
    return fail("payment-not-confirmed")
  }

  const email = tx.customer?.email || "unknown"

  // What was bought is decided from what Paystack says was paid — the plan
  // tag we set at checkout AND an amount that covers that plan's price, in
  // our currency. Any other successful transaction on the account (a test
  // charge, another product) is not a subscription.
  const paid = tx.amount ?? 0
  const tag = tx.metadata?.plan
  let plan: "premium" | "pro" | null = null
  if (tx.currency === PREMIUM_CURRENCY) {
    if (tag === "pro_monthly" && paid >= PRO_PRICE_PESEWAS) plan = "pro"
    else if (tag === "premium_monthly" && paid >= PREMIUM_PRICE_PESEWAS) plan = "premium"
  }
  if (!plan) return fail("payment-not-a-plan")

  // A payment buys PLAN_DAYS from when it was paid, not from when this link
  // is opened — otherwise the same reference could be re-verified every month.
  const paidAtMs = tx.paid_at ? Date.parse(tx.paid_at) : NaN
  if (!Number.isFinite(paidAtMs)) return fail("payment-not-confirmed")
  const expiresAt = Math.floor(paidAtMs / 1000) + PLAN_DAYS * 24 * 60 * 60
  if (expiresAt <= Math.floor(Date.now() / 1000)) return fail("payment-expired")

  // Don't let a later Premium purchase replace a still-valid Pro cookie.
  const existing = req.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${PREMIUM_COOKIE_NAME}=`))
    ?.slice(PREMIUM_COOKIE_NAME.length + 1)
  const current = verifyPremiumCookie(existing ? decodeURIComponent(existing) : null)
  if (plan === "premium" && current && planOf(current) === "pro") {
    return NextResponse.redirect(`${origin}/pricing?welcome=1`)
  }

  const { value, maxAge } = mintPremiumCookie({ email, reference, plan, expiresAt })

  const response = NextResponse.redirect(`${origin}/pricing?welcome=${plan === "pro" ? "pro" : "1"}`)
  response.cookies.set(PREMIUM_COOKIE_NAME, value, {
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    // Readable by hooks/use-premium.ts for UI; integrity is
    // guaranteed by the HMAC signature, not by httpOnly.
    httpOnly: false,
  })
  return response
}
