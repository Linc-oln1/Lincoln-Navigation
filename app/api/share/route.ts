import { NextRequest, NextResponse } from "next/server"
import { newDriverToken } from "@/lib/fleet-server"
import { MAX_DURATION_MIN, ADMIN_ENABLED, cleanText, createAdminClient, hashToken, num, unavailable } from "@/lib/trip-share-server"
import { clientIp } from "@/lib/hazard-identity"
import { overLimit } from "@/lib/rate-limit"

/* Start a live location share. Anyone can; no account needed.
   Body: { label?, destination?, durationMin, lat?, lng? }
   Returns the VIEW token (for the link people receive) and the SENDER key
   (kept in the sender's browser to update or stop the share). */

export async function POST(request: NextRequest) {
  if (!ADMIN_ENABLED) return unavailable()

  // A few shares per hour per address is plenty for real use.
  if (await overLimit(`share:create:${clientIp(request)}`, 10, 60 * 60)) {
    return NextResponse.json({ error: "Too many shares started. Try again later." }, { status: 429 })
  }

  let body: Record<string, unknown> | null = null
  try {
    body = await request.json()
  } catch {}

  const minutes = num(body?.durationMin)
  if (minutes === null || minutes < 5 || minutes > MAX_DURATION_MIN) {
    return NextResponse.json({ error: "Choose how long to share." }, { status: 400 })
  }

  const lat = num(body?.lat)
  const lng = num(body?.lng)
  const hasPos = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

  const viewToken = newDriverToken()
  const senderToken = newDriverToken()
  const now = new Date()

  const { data, error } = await createAdminClient()
    .from("trip_shares")
    .insert({
      view_token_hash: hashToken(viewToken),
      sender_token_hash: hashToken(senderToken),
      label: cleanText(body?.label, 60),
      destination_name: cleanText(body?.destination, 80),
      expires_at: new Date(now.getTime() + minutes * 60_000).toISOString(),
      ...(hasPos ? { last_lat: lat, last_lng: lng, last_seen: now.toISOString() } : {}),
    })
    .select("expires_at")
    .single()

  if (error || !data) {
    console.error("[share] create failed:", error?.message)
    return NextResponse.json({ error: "Could not start sharing." }, { status: 502 })
  }
  return NextResponse.json({ viewToken, senderToken, expiresAt: data.expires_at }, { status: 201 })
}
