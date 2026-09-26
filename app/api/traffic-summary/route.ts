import { NextRequest, NextResponse } from "next/server"

/* =========================================================
   LIVE TRAFFIC SUMMARY  (Free — "Live traffic")

   The free-plan version of live traffic: one number for one route, "how
   busy is it right now". Same Mapbox `driving-traffic` call as the Premium
   route (app/api/traffic-directions), but nothing that draws a map or a
   route comes back — just the travel time now, the usual travel time, and
   a level. The coloured map layer, traffic-aware ETAs and route choices
   stay Premium.

   Because anyone can call this and each miss costs a Mapbox request, it is
   cached briefly (routes rounded to ~100 m) and limited per visitor.
========================================================= */

const CACHE_TTL_MS = 2 * 60 * 1000
const CACHE_MAX_ENTRIES = 500
const RATE_LIMIT = 40
const RATE_WINDOW_MS = 60 * 60 * 1000

interface Summary {
  level: "low" | "moderate" | "heavy" | "severe"
  delayMinutes: number
}

const cache = new Map<string, { expires: number; summary: Summary }>()
const hits = new Map<string, number[]>()

function parseCoordinates(raw: string): [number, number][] | null {
  const pairs = raw.split(";")
  if (pairs.length !== 2) return null
  const out: [number, number][] = []
  for (const pair of pairs) {
    const [lng, lat] = pair.split(",").map(Number)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return null
    out.push([lng, lat])
  }
  return out
}

function overLimit(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key)
    }
  }
  return false
}

/** Ratio of travel time now to usual → a plain-language level. */
function levelFor(ratio: number): Summary["level"] {
  if (ratio < 1.1) return "low"
  if (ratio < 1.3) return "moderate"
  if (ratio < 1.6) return "heavy"
  return "severe"
}

export async function GET(request: NextRequest) {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim()
  if (!token) {
    return NextResponse.json({ error: "Traffic is not configured." }, { status: 501 })
  }

  const coords = parseCoordinates(new URL(request.url).searchParams.get("coordinates") ?? "")
  if (!coords) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 })
  }

  const key = coords.map(([lng, lat]) => `${lng.toFixed(3)},${lat.toFixed(3)}`).join(";")
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) {
    return NextResponse.json(hit.summary, { headers: { "Cache-Control": "private, max-age=60" } })
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (overLimit(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  try {
    const upstream = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords
        .map(([lng, lat]) => `${lng},${lat}`)
        .join(";")}?overview=false&steps=false&alternatives=false&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(8000), cache: "no-store" }
    )
    const data = await upstream.json().catch(() => null)
    const route = data?.routes?.[0]
    if (!upstream.ok || !route || typeof route.duration !== "number") {
      return NextResponse.json({ error: "No traffic data for this route." }, { status: 502 })
    }

    // Without a "usual" time there is nothing to compare against.
    const typical: number | null =
      typeof route.duration_typical === "number" && route.duration_typical > 0
        ? route.duration_typical
        : null
    if (typical === null) {
      return NextResponse.json({ error: "No traffic data for this route." }, { status: 404 })
    }

    const summary: Summary = {
      level: levelFor(route.duration / typical),
      delayMinutes: Math.max(0, Math.round((route.duration - typical) / 60)),
    }

    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, summary })

    return NextResponse.json(summary, { headers: { "Cache-Control": "private, max-age=60" } })
  } catch {
    return NextResponse.json({ error: "Traffic data unreachable." }, { status: 502 })
  }
}
