import { NextRequest, NextResponse } from "next/server"
import { hashToken } from "@/lib/fleet-server"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

/* Driver page lookup: which vehicle does this link belong to? Public — the
   secret in the link is the credential. Returns only the vehicle's name. */

export async function GET(request: NextRequest) {
  if (!ADMIN_ENABLED) return NextResponse.json({ error: "Unavailable." }, { status: 501 })
  const token = new URL(request.url).searchParams.get("token") ?? ""
  if (token.length < 20 || token.length > 100) return NextResponse.json({ error: "Invalid link." }, { status: 404 })

  const { data } = await createAdminClient()
    .from("fleet_vehicles")
    .select("name, plate")
    .eq("driver_token_hash", hashToken(token))
    .maybeSingle()
  if (!data) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 })
  return NextResponse.json({ name: data.name, plate: data.plate })
}
