import { NextRequest, NextResponse } from "next/server"
import { requirePro } from "@/lib/premium-guard"

/* =========================================================
   ROUTE OPTIMIZATION  (Pro — "Route optimization")

   Takes 2–12 stops and returns the best order to visit them, with the leg
   times, the total, and the road geometry. The first stop is always the
   start. Uses the OSRM `trip` solver (a travelling-salesman heuristic) on
   the same public OSRM server as the standard routes — no API key needed.
========================================================= */

const OSRM_TRIP_URL = "https://router.project-osrm.org/trip/v1/driving"
const MAX_STOPS = 12

interface Stop {
  lat: number
  lng: number
}

function parseStops(value: unknown): Stop[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_STOPS) return null
  const out: Stop[] = []
  for (const s of value) {
    const lat = Number(s?.lat)
    const lng = Number(s?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
    out.push({ lat, lng })
  }
  return out
}

export async function POST(request: NextRequest) {
  const gate = requirePro(request)
  if (gate) return gate

  let body: { stops?: unknown; roundtrip?: unknown } | null = null
  try {
    body = await request.json()
  } catch {}

  const stops = parseStops(body?.stops)
  if (!stops) {
    return NextResponse.json(
      { error: `Send between 2 and ${MAX_STOPS} stops as { lat, lng }.` },
      { status: 400 }
    )
  }
  const roundtrip = body?.roundtrip === true

  const coords = stops.map((s) => `${s.lng},${s.lat}`).join(";")
  const params = new URLSearchParams({
    source: "first",
    roundtrip: String(roundtrip),
    geometries: "geojson",
    overview: "full",
    steps: "false",
  })
  // Leaving the end open ("any") is what makes a one-way delivery run cheaper.
  if (!roundtrip) params.set("destination", "any")

  try {
    const upstream = await fetch(`${OSRM_TRIP_URL}/${coords}?${params}`, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    })
    const data = await upstream.json().catch(() => null)
    const trip = data?.trips?.[0]
    if (!upstream.ok || data?.code !== "Ok" || !trip || !Array.isArray(data.waypoints)) {
      return NextResponse.json(
        { error: data?.message || "Could not work out a route between those stops." },
        { status: 502 }
      )
    }

    // waypoints[i] is the i-th INPUT stop; waypoint_index is its position in the trip.
    const order: number[] = new Array(stops.length)
    data.waypoints.forEach((w: { waypoint_index: number }, inputIndex: number) => {
      order[w.waypoint_index] = inputIndex
    })

    return NextResponse.json({
      order,
      legs: (trip.legs as { duration: number; distance: number }[]).map((l) => ({
        duration: l.duration,
        distance: l.distance,
      })),
      duration: trip.duration,
      distance: trip.distance,
      // [lng, lat] pairs from OSRM.
      geometry: trip.geometry.coordinates as [number, number][],
    })
  } catch {
    return NextResponse.json({ error: "The route service didn't respond. Try again." }, { status: 502 })
  }
}
