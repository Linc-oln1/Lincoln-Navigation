// app/api/admin/sponsors/route.ts
//
// Admin only (lib/admin-auth.ts). GET lists every sponsor with its
// view/click totals; POST adds one by hand — e.g. a business that paid
// by MoMo or cash rather than through /advertise.

import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { SPONSOR_DAYS } from "@/lib/monetization"
import { listAllSponsorsWithStats } from "@/lib/sponsor-store"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import { parseSponsorFields } from "./fields"

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 })

export async function GET() {
  if (!(await getAdminUser())) return notFound()
  if (!ADMIN_ENABLED) return NextResponse.json({ error: "Supabase service role not configured." }, { status: 501 })
  try {
    return NextResponse.json({ sponsors: await listAllSponsorsWithStats() })
  } catch (error) {
    console.error("[admin sponsors] list failed:", error)
    return NextResponse.json({ error: "Couldn't load sponsors." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await getAdminUser())) return notFound()
  if (!ADMIN_ENABLED) return NextResponse.json({ error: "Supabase service role not configured." }, { status: 501 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = parseSponsorFields(body, { requireAll: true })
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Added by hand = already paid and approved: live now for SPONSOR_DAYS
  // unless an end date was given.
  const now = new Date()
  const { data, error } = await createAdminClient()
    .from("sponsors")
    .insert({
      ...parsed.fields,
      status: "active",
      starts_at: now.toISOString(),
      ends_at: parsed.fields.ends_at ?? new Date(now.getTime() + SPONSOR_DAYS * 86_400_000).toISOString(),
      paid_at: now.toISOString(),
    })
    .select("id")
    .single()
  if (error) {
    console.error("[admin sponsors] create failed:", error.message)
    return NextResponse.json({ error: "Couldn't save the sponsor." }, { status: 500 })
  }
  return NextResponse.json({ id: data.id })
}
