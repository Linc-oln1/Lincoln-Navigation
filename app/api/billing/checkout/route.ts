// app/api/billing/checkout/route.ts
//
// Starts a Paystack transaction for the premium plan and returns
// the hosted-checkout URL. The browser then redirects the visitor
// there. On completion Paystack sends them back to
// /api/billing/verify?reference=...
//
// Requires env: PAYSTACK_SECRET_KEY  (sk_...)
// Optional:     NEXT_PUBLIC_SITE_URL (defaults to the request origin)

import { NextResponse } from "next/server"
import {
  PREMIUM_CURRENCY,
  PREMIUM_PRICE_PESEWAS,
} from "@/lib/monetization"

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return NextResponse.json(
      { error: "Billing is not configured on this deployment." },
      { status: 501 },
    )
  }

  let email = ""
  try {
    const body = (await req.json()) as { email?: string }
    email = (body.email || "").trim().toLowerCase()
  } catch {
    /* fall through to validation below */
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 },
    )
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
      amount: PREMIUM_PRICE_PESEWAS,
      currency: PREMIUM_CURRENCY,
      callback_url: `${origin}/api/billing/verify`,
      metadata: { plan: "premium_monthly", product: "LincolnNavigation.com" },
    }),
  })

  const data = (await res.json()) as {
    status: boolean
    message: string
    data?: { authorization_url: string; reference: string }
  }

  if (!res.ok || !data.status || !data.data) {
    return NextResponse.json(
      { error: data.message || "Could not start checkout." },
      { status: 502 },
    )
  }

  return NextResponse.json({
    url: data.data.authorization_url,
    reference: data.data.reference,
  })
}
