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
import { getSessionUser } from "@/lib/supabase/server"
import { recordPurchase } from "@/lib/plan-store"
import { fetchTransaction, planPayment } from "@/lib/paystack"

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

  const tx = await fetchTransaction(reference, secret)
  if (!tx) return fail("payment-not-confirmed")

  // The webhook (/api/paystack/webhook) records the same payment even if
  // the buyer never makes it back here; both go through planPayment().
  const payment = planPayment(tx)
  if (!payment.ok) return fail(payment.reason)
  const { plan, email, paidAtMs, expiresAtSec: expiresAt } = payment

  // Remember the payment (and the account, if they're signed in) so the plan
  // can be restored on another device. Best effort: never blocks the unlock.
  const user = await getSessionUser()
  await recordPurchase({
    reference,
    plan,
    email,
    userId: user?.id ?? null,
    paidAtMs,
    expiresAtSec: expiresAt,
  })

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
