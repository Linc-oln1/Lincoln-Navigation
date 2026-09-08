// app/api/billing/verify/route.ts
//
// Paystack redirects the visitor here after payment with
// ?reference=... We verify the transaction server-side, and on
// success set the signed "ln_premium" entitlement cookie and send
// the visitor to /pricing?welcome=1.
//
// Requires env: PAYSTACK_SECRET_KEY

import { NextResponse } from "next/server"
import { mintPremiumCookie, PREMIUM_COOKIE_NAME } from "@/lib/premium-cookie"

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

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  )
  const data = (await res.json()) as {
    status: boolean
    data?: { status: string; customer?: { email?: string } }
  }

  if (!res.ok || !data.status || data.data?.status !== "success") {
    return fail("payment-not-confirmed")
  }

  const email = data.data.customer?.email || "unknown"
  const { value, maxAge } = mintPremiumCookie({ email, reference })

  const response = NextResponse.redirect(`${origin}/pricing?welcome=1`)
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
