// app/api/admin/sponsors/[id]/route.ts
//
// Admin only. PATCH edits a sponsor's fields and/or applies an action:
//   approve  — paid listing goes live now for SPONSOR_DAYS
//   extend   — adds SPONSOR_DAYS to the end date (a renewal payment)
//   pause / resume / end / reject — change status

import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { SPONSOR_DAYS } from "@/lib/monetization"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import { parseSponsorFields } from "../fields"

const DAY_MS = 86_400_000

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!ADMIN_ENABLED) return NextResponse.json({ error: "Supabase service role not configured." }, { status: 501 })

  const { id } = await context.params
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const { action, ...rest } = body
  const parsed = parseSponsorFields(rest, { requireAll: false })
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const db = createAdminClient()
  const { data: current, error: readError } = await db
    .from("sponsors")
    .select("status, starts_at, ends_at")
    .eq("id", id)
    .single()
  if (readError || !current) return NextResponse.json({ error: "Sponsor not found." }, { status: 404 })

  const now = Date.now()
  const update: Record<string, unknown> = { ...parsed.fields, updated_at: new Date(now).toISOString() }

  switch (action) {
    case undefined:
      break
    case "approve":
      update.status = "active"
      update.starts_at = new Date(now).toISOString()
      update.ends_at = parsed.fields.ends_at ?? new Date(now + SPONSOR_DAYS * DAY_MS).toISOString()
      break
    case "extend": {
      // From the current end date if it's still ahead, otherwise from today.
      const from = Math.max(now, current.ends_at ? Date.parse(current.ends_at) : now)
      update.ends_at = new Date(from + SPONSOR_DAYS * DAY_MS).toISOString()
      if (current.status === "ended") update.status = "active"
      break
    }
    case "pause":
      update.status = "paused"
      break
    case "resume":
      update.status = "active"
      break
    case "end":
      update.status = "ended"
      break
    case "reject":
      update.status = "rejected"
      break
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  }

  const { error } = await db.from("sponsors").update(update).eq("id", id)
  if (error) {
    console.error("[admin sponsors] update failed:", error.message)
    return NextResponse.json({ error: "Couldn't update the sponsor." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
