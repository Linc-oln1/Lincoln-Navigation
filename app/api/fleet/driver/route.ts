import { NextRequest, NextResponse } from "next/server"
import { hashToken } from "@/lib/fleet-server"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import { clientIp } from "@/lib/hazard-identity"
import { bump, peek } from "@/lib/rate-limit"

const MISS_LIMIT = 30
const MISS_WINDOW_S = 10 * 60

/* Driver page lookup: which vehicle does this link belong to? Public — the
   secret in the link is the credential. Returns only the vehicle's name. */

export async function GET(request: NextRequest) {
  if (!ADMIN_ENABLED) return NextResponse.json({ error: "Unavailable." }, { status: 501 })
  const token = new URL(request.url).searchParams.get("token") ?? ""
  if (token.length < 20 || token.length > 100) return NextResponse.json({ error: "Invalid link." }, { status: 404 })

  // Same limit as /api/fleet/position: many wrong links from one address in a
  // short time is someone guessing, so stop answering.
  const missKey = `fleet:miss:${clientIp(request)}`
  if ((await peek(missKey)) >= MISS_LIMIT) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  const { data } = await createAdminClient()
    .from("fleet_vehicles")
    .select("name, plate")
    .eq("driver_token_hash", hashToken(token))
    .maybeSingle()
  if (!data) {
    await bump(missKey, MISS_WINDOW_S)
    return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 })
  }
  return NextResponse.json({ name: data.name, plate: data.plate })
}
