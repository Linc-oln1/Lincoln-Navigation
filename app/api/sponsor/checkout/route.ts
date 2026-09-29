// app/api/sponsor/checkout/route.ts
//
// A business buying a sponsored listing from /advertise. Saves the
// listing as "awaiting_payment", starts a Paystack transaction for the
// chosen package and returns the hosted-checkout URL. Paystack sends
// the buyer back to /api/sponsor/verify, which marks it paid; the
// listing only goes live once it's approved at /admin/sponsors.
//
// Requires env: PAYSTACK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

import { NextResponse } from "next/server"
import { clientIp } from "@/lib/hazard-identity"
import { overLimit } from "@/lib/rate-limit"
import { PREMIUM_CURRENCY, sponsorPackage } from "@/lib/monetization"
import { SPONSOR_CATEGORIES } from "@/lib/sponsored-places"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret || !ADMIN_ENABLED) {
    return NextResponse.json({ error: "Online payment isn't set up yet." }, { status: 501 })
  }
  if (await overLimit(`sponsor:checkout:${clientIp(req)}`, 10, 3600)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    /* validated below */
  }

  const pkg = sponsorPackage(str(body.package, 20))
  const name = str(body.name, 80)
  const address = str(body.address, 200)
  const category = str(body.category, 40)
  const tagline = str(body.tagline, 90)
  const url = str(body.url, 300)
  const contactName = str(body.contactName, 80)
  const email = str(body.email, 200).toLowerCase()
  const phone = str(body.phone, 30)
  const lat = Number(body.lat)
  const lng = Number(body.lng)

  const problem =
    !pkg ? "Choose a package."
    : name.length < 2 ? "Enter your business name."
    : !address ? "Choose your business location."
    : !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180
      ? "Choose your business location."
    : !SPONSOR_CATEGORIES.some((c) => c.id === category) ? "Choose a category."
    : url && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(url) ? "The website should start with http:// or https://"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter a valid email address."
    : null
  if (problem || !pkg) return NextResponse.json({ error: problem }, { status: 400 })

  // Our own reference, saved before payment starts, so the verify step
  // can always match the payment to this listing.
  const reference = `lnsp_${crypto.randomUUID().replace(/-/g, "")}`
  const db = createAdminClient()
  const { data: row, error } = await db
    .from("sponsors")
    .insert({
      name,
      address,
      lat,
      lng,
      category,
      tagline: tagline || null,
      url: url || null,
      package: pkg.id,
      radius_km: pkg.radiusKm,
      status: "awaiting_payment",
      contact_name: contactName || null,
      contact_email: email,
      contact_phone: phone || null,
      amount_pesewas: pkg.pricePesewas,
      paystack_reference: reference,
    })
    .select("id")
    .single()
  if (error || !row) {
    console.error("[sponsor checkout] could not save listing:", error?.message)
    return NextResponse.json({ error: "Couldn't save your listing. Try again." }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(req.url).origin
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      reference,
      amount: pkg.pricePesewas,
      currency: PREMIUM_CURRENCY,
      callback_url: `${origin}/api/sponsor/verify`,
      metadata: {
        product: "LincolnNavigation.com sponsored listing",
        sponsor_id: row.id,
        package: pkg.id,
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
