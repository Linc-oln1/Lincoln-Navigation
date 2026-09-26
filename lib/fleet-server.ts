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
