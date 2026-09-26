import { NextRequest, NextResponse } from "next/server"
import { requireFleetOwner } from "@/lib/fleet-server"

/* Fleet activity (Pro — "Business analytics"): per-vehicle daily totals for
   the last 7 or 30 days. Owner only. */

export async function GET(request: NextRequest) {
  const ctx = await requireFleetOwner(request)
  if ("error" in ctx) return ctx.error

  const days = new URL(request.url).searchParams.get("days") === "30" ? 30 : 7
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10)

  const { data: vehicles, error: vErr } = await ctx.admin
    .from("fleet_vehicles")
    .select("id, name, plate")
    .eq("owner_id", ctx.user.id)
    .order("created_at", { ascending: true })
  if (vErr) return NextResponse.json({ error: "Could not load your fleet." }, { status: 502 })

  const ids = (vehicles ?? []).map((v) => v.id)
  if (ids.length === 0) return NextResponse.json({ days, since, vehicles: [], rows: [] })

  const { data: rows, error } = await ctx.admin
    .from("fleet_daily_stats")
    .select("vehicle_id, day, distance_m, moving_seconds, max_speed")
    .in("vehicle_id", ids)
    .gte("day", since)
    .order("day", { ascending: true })
  if (error) {
    console.error("[fleet] stats failed:", error.message)
    return NextResponse.json({ error: "Could not load activity." }, { status: 502 })
  }
  return NextResponse.json({ days, since, vehicles, rows: rows ?? [] })
}
