import { NextRequest, NextResponse } from "next/server"
import { hashToken, segmentSample } from "@/lib/fleet-server"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

/* Driver phone → its latest position. Public: the secret driver link is the
   credential (no account needed for the driver). Only the latest position is
   stored. `{ stop: true }` clears it so the vehicle shows as offline at once. */

const MIN_INTERVAL_MS = 3000
const lastPost = new Map<string, number>()

export async function POST(request: NextRequest) {
  if (!ADMIN_ENABLED) return NextResponse.json({ error: "Unavailable." }, { status: 501 })

  let body: { token?: unknown; lat?: unknown; lng?: unknown; speed?: unknown; heading?: unknown; stop?: unknown } | null = null
  try {
    body = await request.json()
  } catch {}

  const token = typeof body?.token === "string" ? body.token : ""
  if (token.length < 20 || token.length > 100) return NextResponse.json({ error: "Invalid link." }, { status: 404 })
  const hash = hashToken(token)

  const admin = createAdminClient()

  if (body?.stop === true) {
    const { data } = await admin
      .from("fleet_vehicles")
      .update({ last_lat: null, last_lng: null, last_speed: null, last_heading: null, last_seen: null })
      .eq("driver_token_hash", hash)
      .select("id")
      .maybeSingle()
    return data ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Invalid link." }, { status: 404 })
  }

  const lat = Number(body?.lat)
  const lng = Number(body?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Invalid position." }, { status: 400 })
  }
  const speed = Number.isFinite(Number(body?.speed)) && body?.speed !== null ? Number(body?.speed) : null
  const heading = Number.isFinite(Number(body?.heading)) && body?.heading !== null ? Number(body?.heading) : null

  // Cheap per-server throttle so a stuck client can't hammer the database.
  const now = Date.now()
  if (now - (lastPost.get(hash) ?? 0) < MIN_INTERVAL_MS) return NextResponse.json({ ok: true, throttled: true })
  lastPost.set(hash, now)
  if (lastPost.size > 2000) lastPost.clear()

  // What the vehicle last reported, so the segment since then can be added
  // to today's totals (business analytics — see 0004_fleet_daily_stats.sql).
  const { data: prev } = await admin
    .from("fleet_vehicles")
    .select("id, last_lat, last_lng, last_seen")
    .eq("driver_token_hash", hash)
    .maybeSingle()
  if (!prev) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 })

  const nowIso = new Date().toISOString()
  const { error } = await admin
    .from("fleet_vehicles")
    .update({ last_lat: lat, last_lng: lng, last_speed: speed, last_heading: heading, last_seen: nowIso })
    .eq("id", prev.id)
  if (error) return NextResponse.json({ error: "Could not save the position." }, { status: 502 })

  const sample = segmentSample(
    prev.last_lat != null && prev.last_lng != null && prev.last_seen
      ? { lat: prev.last_lat, lng: prev.last_lng, at: new Date(prev.last_seen).getTime() }
      : null,
    { lat, lng, at: Date.parse(nowIso), speed }
  )
  if (sample) {
    // Best effort: analytics must never make a position update fail.
    const { error: statsError } = await admin.rpc("fleet_add_sample", {
      p_vehicle: prev.id,
      p_day: nowIso.slice(0, 10),
      p_dist: sample.distanceM,
      p_secs: sample.movingSeconds,
      p_speed: sample.speed,
    })
    if (statsError) console.error("[fleet] stats update failed:", statsError.message)
  }
  return NextResponse.json({ ok: true })
}
