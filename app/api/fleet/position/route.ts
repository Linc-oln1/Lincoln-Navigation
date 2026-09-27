import { NextRequest, NextResponse } from "next/server"
import { hashToken, segmentSample } from "@/lib/fleet-server"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import { clientIp } from "@/lib/hazard-identity"
import { bump, peek } from "@/lib/rate-limit"

/* Driver phone → its latest position. Public: the secret driver link is the
   credential (no account needed for the driver). Only the latest position is
   stored. `{ stop: true }` clears it so the vehicle shows as offline at once. */

const MIN_INTERVAL_MS = 3000
const lastPost = new Map<string, number>()

// Guessing driver links: hits are free, but an address that keeps sending
// links that don't exist gets cut off for a while. Counted per address and
// kept in the shared store, so it holds across server instances.
const MISS_LIMIT = 30
const MISS_WINDOW_S = 10 * 60

/** A real, finite number — not null, "", false or a numeric string. */
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export async function POST(request: NextRequest) {
  if (!ADMIN_ENABLED) return NextResponse.json({ error: "Unavailable." }, { status: 501 })

  let body: { token?: unknown; lat?: unknown; lng?: unknown; speed?: unknown; heading?: unknown; stop?: unknown } | null = null
  try {
    body = await request.json()
  } catch {}

  const token = typeof body?.token === "string" ? body.token : ""
  if (token.length < 20 || token.length > 100) return NextResponse.json({ error: "Invalid link." }, { status: 404 })
  const hash = hashToken(token)

  const missKey = `fleet:miss:${clientIp(request)}`
  if ((await peek(missKey)) >= MISS_LIMIT) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }
  const notFound = async (message: string) => {
    await bump(missKey, MISS_WINDOW_S)
    return NextResponse.json({ error: message }, { status: 404 })
  }

  const admin = createAdminClient()

  if (body?.stop === true) {
    const { data } = await admin
      .from("fleet_vehicles")
      .update({ last_lat: null, last_lng: null, last_speed: null, last_heading: null, last_seen: null })
      .eq("driver_token_hash", hash)
      .select("id")
      .maybeSingle()
    return data ? NextResponse.json({ ok: true }) : notFound("Invalid link.")
  }

  const lat = num(body?.lat)
  const lng = num(body?.lng)
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Invalid position." }, { status: 400 })
  }
  const rawSpeed = num(body?.speed)
  const speed = rawSpeed !== null && rawSpeed >= 0 ? rawSpeed : null
  const rawHeading = num(body?.heading)
  const heading = rawHeading !== null && rawHeading >= 0 && rawHeading <= 360 ? rawHeading : null

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
  if (!prev) return notFound("This link is no longer valid.")

  // Compare-and-swap on last_seen: only the request that still sees the
  // position it read stores its fix and adds its segment to the totals. If two
  // updates overlap (a retry, two phones on one link), the loser is dropped
  // instead of both counting the same distance from the same starting point.
  const nowIso = new Date().toISOString()
  let update = admin
    .from("fleet_vehicles")
    .update({ last_lat: lat, last_lng: lng, last_speed: speed, last_heading: heading, last_seen: nowIso })
    .eq("id", prev.id)
  update = prev.last_seen ? update.eq("last_seen", prev.last_seen) : update.is("last_seen", null)
  const { data: won, error } = await update.select("id").maybeSingle()
  if (error) return NextResponse.json({ error: "Could not save the position." }, { status: 502 })
  if (!won) return NextResponse.json({ ok: true, raced: true })

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
