import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ENABLED, blocked, createAdminClient, hashToken, notFound, tokenOk, unavailable } from "@/lib/trip-share-server"

/* What the people with the link see. Needs the VIEW token; never returns the
   sender key. A finished or expired share returns status "ended" with no
   position. */

export async function GET(request: NextRequest) {
  if (!ADMIN_ENABLED) return unavailable()

  const token = new URL(request.url).searchParams.get("token")
  if (!tokenOk(token)) return NextResponse.json({ error: "Invalid link." }, { status: 404 })
  const limited = await blocked(request)
  if (limited) return limited

  const { data } = await createAdminClient()
    .from("trip_shares")
    .select("label, destination_name, last_lat, last_lng, last_speed, last_heading, last_seen, expires_at, ended_at")
    .eq("view_token_hash", hashToken(token))
    .maybeSingle()

  if (!data) return notFound(request)

  const now = Date.now()
  const ended = Boolean(data.ended_at) || Date.parse(data.expires_at) <= now
  const headers = { "Cache-Control": "no-store" }

  if (ended) {
    return NextResponse.json({ status: "ended", label: data.label, destination: data.destination_name }, { headers })
  }
  return NextResponse.json(
    {
      status: "live",
      label: data.label,
      destination: data.destination_name,
      expiresAt: data.expires_at,
      serverTime: new Date(now).toISOString(),
      position:
        data.last_lat != null && data.last_lng != null
          ? {
              lat: data.last_lat,
              lng: data.last_lng,
              speed: data.last_speed,
              heading: data.last_heading,
              seenAt: data.last_seen,
            }
          : null,
    },
    { headers }
  )
}
