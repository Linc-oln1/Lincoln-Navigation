// app/api/sponsor/verify/route.ts
//
// Paystack sends a sponsorship buyer here after paying, with
// ?reference=... We confirm the payment server-side, check it covers
// the package they chose, and mark the listing "pending_review" so it
// shows up for approval at /admin/sponsors. Then back to /advertise.
//
// Requires env: PAYSTACK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

import { NextResponse } from "next/server"
import { PREMIUM_CURRENCY, sponsorPackage } from "@/lib/monetization"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref")
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin
  const back = (q: string) => NextResponse.redirect(`${origin}/advertise?${q}#buy`)

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret || !ADMIN_ENABLED || !reference) return back("error=payment-not-confirmed")

  let tx: {
    status?: string
    amount?: number
    currency?: string
    paid_at?: string | null
    metadata?: { sponsor_id?: string; package?: string } | null
  } | undefined
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15000) },
    )
    const data = res.ok ? ((await res.json()) as { status?: boolean; data?: typeof tx }) : null
    tx = data?.status ? data.data : undefined
  } catch {
    return back("error=payment-not-confirmed")
  }
  if (tx?.status !== "success") return back("error=payment-not-confirmed")

  const sponsorId = tx.metadata?.sponsor_id
  const pkg = sponsorPackage(tx.metadata?.package ?? "")
  if (!sponsorId || !pkg || tx.currency !== PREMIUM_CURRENCY || (tx.amount ?? 0) < pkg.pricePesewas) {
    return back("error=payment-not-a-listing")
  }

  // Only a listing still waiting for this exact payment moves on, so
  // re-opening the link can't reset one that's already live or ended.
  const { error } = await createAdminClient()
    .from("sponsors")
    .update({
      status: "pending_review",
      paid_at: tx.paid_at ?? new Date().toISOString(),
      amount_pesewas: tx.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sponsorId)
    .eq("paystack_reference", reference)
    .eq("status", "awaiting_payment")
  if (error) {
    console.error("[sponsor verify] could not mark paid:", error.message)
    return back("error=payment-not-recorded")
  }

  return back("paid=1")
}
