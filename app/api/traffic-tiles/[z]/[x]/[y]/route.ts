import { NextRequest, NextResponse } from "next/server"
import { requirePremium } from "@/lib/premium-guard"

/* =========================================================
   LIVE TRAFFIC TILES  (Premium — "Advanced traffic")

   The map's traffic layer reads vector tiles from THIS route, not from
   Mapbox directly, so that:
     - the Mapbox token stays on the server (MAPBOX_ACCESS_TOKEN),
     - only signed-in Premium subscribers can pull tiles (their signed
       cookie is verified here, not just hidden in the UI), and
     - a burst of pans doesn't turn into a burst of Mapbox requests
       (short in-memory cache below).

   Source: Mapbox Traffic v1 — road lines tagged with a `congestion`
   level: low | moderate | heavy | severe.
========================================================= */

const TILESET = "mapbox.mapbox-traffic-v1"
const MIN_ZOOM = 6
const MAX_ZOOM = 16
const CACHE_TTL_MS = 60 * 1000
const CACHE_MAX_ENTRIES = 300

const cache = new Map<string, { expires: number; body: ArrayBuffer }>()

function intParam(value: string): number | null {
  return /^\d{1,7}$/.test(value) ? Number(value) : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const gate = requirePremium(request)
  if (gate) return gate

  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim()
  if (!token) {
    return NextResponse.json(
      { error: "MAPBOX_ACCESS_TOKEN is not configured." },
      { status: 501 }
    )
  }

  const raw = await params
  const z = intParam(raw.z)
  const x = intParam(raw.x)
  // Mapbox tile URLs end in ".vector.pbf"; MapLibre asks for a bare y.
  const y = intParam(raw.y.replace(/\.(pbf|mvt)$/, ""))
  if (z === null || x === null || y === null || z < MIN_ZOOM || z > MAX_ZOOM) {
    return NextResponse.json({ error: "Invalid tile." }, { status: 400 })
  }
  const limit = 2 ** z
  if (x >= limit || y >= limit) {
    return NextResponse.json({ error: "Invalid tile." }, { status: 400 })
  }

  const key = `${z}/${x}/${y}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) {
    return tileResponse(hit.body)
  }

  try {
    const upstream = await fetch(
      `https://api.mapbox.com/v4/${TILESET}/${z}/${x}/${y}.vector.pbf?access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(8000) }
    )

    if (upstream.status === 404) {
      // No traffic data in this tile — an empty tile, not an error.
      return new NextResponse(null, { status: 204 })
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Traffic provider error (${upstream.status}).` },
        { status: 502 }
      )
    }

    // fetch() has already un-gzipped the body, so we send it as plain bytes.
    const body = await upstream.arrayBuffer()
    if (cache.size >= CACHE_MAX_ENTRIES) {
      cache.delete(cache.keys().next().value as string)
    }
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, body })
    return tileResponse(body)
  } catch {
    return NextResponse.json({ error: "Traffic provider unreachable." }, { status: 502 })
  }
}

function tileResponse(body: ArrayBuffer) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/x-protobuf",
      // Premium-only, so never cached by shared caches.
      "Cache-Control": "private, max-age=60",
    },
  })
}
