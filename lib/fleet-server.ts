// lib/fleet-server.ts  (server only)
//
// Shared pieces of the fleet API routes: who may manage a fleet, how the
// driver-link secret is made and checked, and the shape sent to the browser.

import { createHash, randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { requirePro } from "@/lib/premium-guard"
import { getSessionUser } from "@/lib/supabase/server"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

export const MAX_VEHICLES = 25
export const VEHICLE_KINDS = ["car", "van", "truck", "motorcycle", "bus", "bicycle"] as const
export type VehicleKind = (typeof VEHICLE_KINDS)[number]

export interface VehicleRow {
  id: string
  name: string
  plate: string | null
  kind: string
  last_lat: number | null
  last_lng: number | null
  last_speed: number | null
  last_heading: number | null
  last_seen: string | null
  created_at: string
}

export const VEHICLE_COLUMNS =
  "id, name, plate, kind, last_lat, last_lng, last_speed, last_heading, last_seen, created_at"

export function newDriverToken(): string {
  return randomBytes(24).toString("base64url")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Pro plan + signed-in account, or the error response to return.
 * (Pro is per device; the account is what owns the vehicles.)
 */
export async function requireFleetOwner(req: Request) {
  if (!ADMIN_ENABLED) {
    return {
      error: NextResponse.json({ error: "Fleet tools aren't set up on this deployment." }, { status: 501 }),
    }
  }
  const gate = requirePro(req)
  if (gate) return { error: gate }
  const user = await getSessionUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: "sign_in_required" }, { status: 401 }),
    }
  }
  return { user, admin: createAdminClient() }
}

/* ------------------------- activity analytics ------------------------- */

interface Fix {
  lat: number
  lng: number
  at: number
  speed?: number | null
}

function haversineM(a: Fix, b: Fix): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

// Gaps longer than this mean the phone stopped reporting (screen off, no
// signal), so the straight line between the two fixes proves nothing.
const MAX_GAP_S = 5 * 60
// Slower than this over a segment counts as standing still (GPS jitter).
const MOVING_MS = 1.5
// Faster than this is a GPS jump, not a vehicle (~200 km/h).
const MAX_PLAUSIBLE_MS = 55

/**
 * The distance / moving time / speed to add to today's totals for one
 * position-to-position segment, or null if the segment shouldn't count.
 */
export function segmentSample(prev: Fix | null, next: Fix) {
  if (!prev) return null
  const seconds = (next.at - prev.at) / 1000
  if (seconds < 1 || seconds > MAX_GAP_S) return null
  const distanceM = haversineM(prev, next)
  const implied = distanceM / seconds
  if (implied > MAX_PLAUSIBLE_MS) return null
  const moving = implied >= MOVING_MS
  const reported = typeof next.speed === "number" && Number.isFinite(next.speed) && next.speed >= 0 ? next.speed : implied
  return {
    distanceM: moving ? distanceM : 0,
    movingSeconds: moving ? Math.round(seconds) : 0,
    speed: Math.min(MAX_PLAUSIBLE_MS, reported),
  }
}
