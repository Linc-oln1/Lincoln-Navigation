// app/api/sponsor/renew/route.ts
//
// "Renew my listing" from the emailed link (/advertise/renew). Body:
// { l: sponsor id, t: link signature }. Starts a Paystack payment for the
// same package (cards or mobile money) and returns the checkout URL.
// Paystack sends the advertiser back to /api/sponsor/verify; that and the
// webhook extend the listing once (markSponsorRenewed).
//
// Requires env: PAYSTACK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

import { NextResponse } from "next/server"
import { clientIp } from "@/lib/hazard-identity"
import { PREMIUM_CURRENCY } from "@/lib/monetization"
import { overLimit } from "@/lib/rate-limit"
import { isValidRenewToken } from "@/lib/sponsor-link"
import { renewalOffer } from "@/lib/sponsor-renewal"
import { getSponsor } from "@/lib/sponsor-store"
import { ADMIN_ENABLED } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret || !ADMIN_ENABLED) {
    return NextResponse.json({ error: "Online payment isn't set up yet." }, { status: 501 })
  }
  if (await overLimit(`sponsor:renew:${clientIp(req)}`, 10, 3600)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  const body = (await req.json().catch(() => ({}))) as { l?: unknown; t?: unknown }
  const id = typeof body.l === "string" ? body.l : ""
  const token = typeof body.t === "string" ? body.t : ""
  if (!isValidRenewToken(id, token)) {
    return NextResponse.json({ error: "This renew link isn't valid. Use the link in our latest email." }, { status: 404 })
  }
  const sponsor = await getSponsor(id)
  if (!sponsor) return NextResponse.json({ error: "Listing not found." }, { status: 404 })
  const offer = renewalOffer(sponsor)
  if (!offer.ok) {
    return NextResponse.json({ error: "This listing can't be renewed online. Reply to our email and we'll help." }, { status: 409 })
  }

  const reference = `lnsr_${crypto.randomUUID().replace(/-/g, "")}`
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(req.url).origin
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: sponsor.contact_email,
      reference,
      amount: offer.pkg.pricePesewas,
      currency: PREMIUM_CURRENCY,
      callback_url: `${origin}/api/sponsor/verify`,
      metadata: {
        product: "LincolnNavigation.com sponsored listing renewal",
        sponsor_id: sponsor.id,
        package: offer.pkg.id,
        kind: "renewal",
      },
    }),
  }).catch(() => null)

  const data = (await res?.json().catch(() => null)) as {
    status?: boolean
    message?: string
    data?: { authorization_url: string }
  } | null
  if (!res?.ok || !data?.status || !data.data) {
    return NextResponse.json({ error: data?.message || "Couldn't start payment." }, { status: 502 })
  }
  return NextResponse.json({ url: data.data.authorization_url })
}
