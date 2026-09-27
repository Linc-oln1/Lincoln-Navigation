import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ENABLED, blocked, createAdminClient, hashToken, notFound, num, tokenOk, unavailable } from "@/lib/trip-share-server"

/* The sender's phone → its latest position. Needs the SENDER key. Ignored
   once the share has ended or expired. */

const MIN_INTERVAL_MS = 3000
const lastPost = new Map<string, number>()

export async function POST(request: NextRequest) {
  if (!ADMIN_ENABLED) return unavailable()

  let body: Record<string, unknown> | null = null
  try {
    body = await request.json()
  } catch {}

  const token = body?.senderToken
  if (!tokenOk(token)) return NextResponse.json({ error: "Invalid link." }, { status: 404 })

  const limited = await blocked(request)
  if (limited) return limited

  const lat = num(body?.lat)
  const lng = num(body?.lng)
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Invalid position." }, { status: 400 })
  }
  const rawSpeed = num(body?.speed)
  const rawHeading = num(body?.heading)

  const hash = hashToken(token)
  const now = Date.now()
  if (now - (lastPost.get(hash) ?? 0) < MIN_INTERVAL_MS) return NextResponse.json({ ok: true, throttled: true })
  lastPost.set(hash, now)
  if (lastPost.size > 2000) lastPost.clear()

  const nowIso = new Date(now).toISOString()
  const { data, error } = await createAdminClient()
    .from("trip_shares")
    .update({
      last_lat: lat,
      last_lng: lng,
      last_speed: rawSpeed !== null && rawSpeed >= 0 ? rawSpeed : null,
      last_heading: rawHeading !== null && rawHeading >= 0 && rawHeading <= 360 ? rawHeading : null,
      last_seen: nowIso,
    })
    .eq("sender_token_hash", hash)
    .is("ended_at", null)
    .gt("expires_at", nowIso)
    .select("id")
    .maybeSingle()

  if (error) return NextResponse.json({ error: "Could not save the position." }, { status: 502 })
  if (!data) {
    // Either a wrong key or a share that has already ended/expired: say
    // "ended" (410) for the latter so the sender's page can stop cleanly.
    const { data: exists } = await createAdminClient().from("trip_shares").select("id").eq("sender_token_hash", hash).maybeSingle()
    return exists ? NextResponse.json({ error: "This share has ended." }, { status: 410 }) : notFound(request)
  }
  return NextResponse.json({ ok: true })
}
