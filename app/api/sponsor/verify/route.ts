// app/api/sponsor/verify/route.ts
//
// Paystack sends a sponsorship buyer here after paying, with
// ?reference=... We confirm the payment server-side, check it covers
// the package they chose, and mark the listing "pending_review" so it
// shows up for approval at /admin/sponsors. Then back to /advertise.
//
// Requires env: PAYSTACK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

import { NextResponse } from "next/server"
import { fetchTransaction, markSponsorPaid, markSponsorRenewed } from "@/lib/paystack"
import { renewPath } from "@/lib/sponsor-link"
import { ADMIN_ENABLED } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref")
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin
  const back = (q: string) => NextResponse.redirect(`${origin}/advertise?${q}#buy`)

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret || !ADMIN_ENABLED || !reference) return back("error=payment-not-confirmed")

  const tx = await fetchTransaction(reference, secret)
  if (tx?.status !== "success") return back("error=payment-not-confirmed")

  // A renewal from /advertise/renew goes back to that page.
  if (tx.metadata?.kind === "renewal" && tx.metadata.sponsor_id) {
    const page = (q: string) => NextResponse.redirect(`${origin}${renewPath(tx.metadata!.sponsor_id!)}&${q}`)
    const renewed = await markSponsorRenewed(tx, reference)
    if (renewed === "ok") return page("paid=1")
    return page(renewed === "error" ? "error=payment-not-recorded" : "error=payment-not-a-listing")
  }

  // The webhook may already have marked it paid; markSponsorPaid() is a
  // no-op then, so this still lands on "paid".
  const result = await markSponsorPaid(tx, reference)
  if (result === "not-a-listing") return back("error=payment-not-a-listing")
  if (result === "error") return back("error=payment-not-recorded")

  return back("paid=1")
}
