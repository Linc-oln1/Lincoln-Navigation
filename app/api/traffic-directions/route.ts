import { NextRequest, NextResponse } from "next/server"
import { requirePremium } from "@/lib/premium-guard"

/* =========================================================
   TRAFFIC-AWARE ROUTING  (Premium — "Advanced traffic")

   Same request the standard route makes, but through Mapbox's
   `driving-traffic` profile, so the travel time reflects current traffic
   (and `duration_typical` says what it usually is). Mapbox's response is
   OSRM-compatible, so lib/routing.ts parses it with the same code as a
   normal route and simply falls back to the standard route if this fails.
========================================================= */

function parseCoordinates(raw: string): string | null {
  const pairs = raw.split(";")
  if (pairs.length < 2 || pairs.length > 12) return null
  for (const pair of pairs) {
    const [lng, lat] = pair.split(",").map(Number)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return null
  }
  return pairs.join(";")
}

export async function GET(request: NextRequest) {
  const gate = requirePremium(request)
  if (gate) return gate

  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim()
  if (!token) {
    return NextResponse.json(
      { error: "MAPBOX_ACCESS_TOKEN is not configured." },
      { status: 501 }
    )
  }

  const { searchParams } = new URL(request.url)
  const coordinates = parseCoordinates(searchParams.get("coordinates") ?? "")
  if (!coordinates) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 })
  }

  const params = new URLSearchParams({
    alternatives: searchParams.get("alternatives") === "1" ? "true" : "false",
    geometries: "geojson",
    overview: "full",
    steps: "true",
    access_token: token,
  })

  try {
    const upstream = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?${params}`,
      { signal: AbortSignal.timeout(12000), cache: "no-store" }
    )
    const data = await upstream.json().catch(() => null)
    if (!upstream.ok || !data) {
      return NextResponse.json(
        { error: data?.message || `Traffic routing failed (${upstream.status}).` },
        { status: 502 }
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Traffic routing unreachable." }, { status: 502 })
  }
}
