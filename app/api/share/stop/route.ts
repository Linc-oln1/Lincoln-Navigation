import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ENABLED, blocked, createAdminClient, hashToken, notFound, tokenOk, unavailable } from "@/lib/trip-share-server"

/* The sender ends the share. The last position is cleared straight away. */

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

  const { data } = await createAdminClient()
    .from("trip_shares")
    .update({
      ended_at: new Date().toISOString(),
      last_lat: null,
      last_lng: null,
      last_speed: null,
      last_heading: null,
    })
    .eq("sender_token_hash", hashToken(token))
    .select("id")
    .maybeSingle()

  return data ? NextResponse.json({ ok: true }) : notFound(request)
}
