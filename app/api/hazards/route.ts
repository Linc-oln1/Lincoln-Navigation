import { NextRequest, NextResponse } from "next/server"

import {
  isHazardKind,
  type BBox,
  type Hazard,
} from "@/lib/hazards"
import {
  getHazardStore,
  sanitizeNote,
} from "@/lib/hazard-store"
import { reporterHash } from "@/lib/hazard-identity"
import { HAZARD_SEED } from "@/lib/geo-intelligence/route-intelligence"
import { haversineMeters } from "@/lib/geo-intelligence/confidence"
import { getFeedHazards } from "@/lib/hazard-feeds"

/* =========================================================
   COMMUNITY HAZARD REPORTS

   GET  /api/hazards?bbox=minLng,minLat,maxLng,maxLat
     → { hazards, configured }
     Active crowd reports inside the box, plus any known
     seed/official hazard zones that fall inside it. `configured`
     is false when no shared store is set up — the map just shows
     nothing rather than erroring.

   POST /api/hazards   { kind, lat, lng, note? }
     → { hazard }              (201)
     → { hazard }              (409, a matching report already exists nearby)
     → { error }               (429, this reporter has sent too many)
     → { error, configured:false } (503, no store configured)

   Reports are anonymous. A one-way reporterHash (see
   lib/hazard-identity.ts) is used only to rate-limit and
   de-duplicate — never stored on the hazard, never linked to a
   person.
========================================================= */

export const runtime = "nodejs"

const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_MAX = 5
const DUPLICATE_RADIUS_M = 100
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000

/* ---- seed / official zones → the same Hazard shape ---- */

function centroid(points: { lat: number; lng: number }[]): {
  lat: number
  lng: number
} {
  if (points.length === 0) return { lat: 0, lng: 0 }
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  )
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

// Non-flood seed zones stay static. Flood zones are handled by the
// forecast-flood feed instead — they only appear while the rain
// forecast for them is bad (Phase 3b).
function staticSeedHazards(): Hazard[] {
  return HAZARD_SEED.filter((zone) => zone.kind !== "flood").map((zone) => ({
    id: zone.id,
    kind: zone.kind,
    location: centroid(zone.polygonOrLine),
    note: zone.description,
    source: zone.source === "official" ? "official" : "seed_dataset",
    createdAt: zone.reportedAt ?? "2024-01-01T00:00:00.000Z",
    expiresAt: undefined,
    confirmedCount: 0,
    clearedCount: 0,
    severity: zone.severity,
    status: "active",
  }))
}

async function baseHazards(): Promise<Hazard[]> {
  const feeds = await getFeedHazards().catch(() => [])
  return [...staticSeedHazards(), ...feeds]
}

function parseBBox(raw: string | null): BBox | null {
  if (!raw) return null
  const parts = raw.split(",").map((n) => Number.parseFloat(n))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null
  const [minLng, minLat, maxLng, maxLat] = parts
  if (minLng > maxLng || minLat > maxLat) return null
  if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180) return null
  return { minLng, minLat, maxLng, maxLat }
}

function inBBox(h: Hazard, b: BBox): boolean {
  return (
    h.location.lng >= b.minLng &&
    h.location.lng <= b.maxLng &&
    h.location.lat >= b.minLat &&
    h.location.lat <= b.maxLat
  )
}

/* ---------------------------------------------------------
   GET
--------------------------------------------------------- */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bbox = parseBBox(searchParams.get("bbox"))

  if (!bbox) {
    return NextResponse.json(
      { error: "bbox=minLng,minLat,maxLng,maxLat is required." },
      { status: 400 }
    )
  }

  const store = getHazardStore()
  const seeds = (await baseHazards()).filter((h) => inBBox(h, bbox))

  if (!store) {
    // No shared store — still surface the static seed + forecast
    // zones so the feature isn't completely invisible, but say it's
    // not fully on.
    return NextResponse.json(
      { hazards: seeds, configured: false },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    )
  }

  try {
    const crowd = await store.listActive(bbox)
    return NextResponse.json(
      { hazards: [...crowd, ...seeds], configured: true },
      { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } }
    )
  } catch (error) {
    console.error("[hazards] GET failed:", error)
    return NextResponse.json({ hazards: seeds, configured: true, degraded: true })
  }
}

/* ---------------------------------------------------------
   POST
--------------------------------------------------------- */

export async function POST(request: NextRequest) {
  const store = getHazardStore()
  if (!store) {
    return NextResponse.json(
      {
        error: "Hazard reporting isn't available yet.",
        configured: false,
      },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { kind, lat, lng, note } = (body ?? {}) as Record<string, unknown>

  if (!isHazardKind(kind)) {
    return NextResponse.json({ error: "Unknown hazard kind." }, { status: 400 })
  }

  const latNum = Number(lat)
  const lngNum = Number(lng)
  if (
    !Number.isFinite(latNum) ||
    !Number.isFinite(lngNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lngNum < -180 ||
    lngNum > 180
  ) {
    return NextResponse.json(
      { error: "Valid lat and lng are required." },
      { status: 400 }
    )
  }

  const hash = reporterHash(request)

  // Rate limit.
  const recent = await store.countRecentByReporter(hash, RATE_WINDOW_MS)
  if (recent >= RATE_MAX) {
    return NextResponse.json(
      { error: "You've reported a lot recently. Try again later." },
      { status: 429 }
    )
  }

  // Near-duplicate: same kind, within 100 m, reported in the last 30 min.
  const pad = 0.003 // ~330 m — a generous box we then distance-filter
  const nearby = await store.listActive({
    minLng: lngNum - pad,
    minLat: latNum - pad,
    maxLng: lngNum + pad,
    maxLat: latNum + pad,
  })
  const dup = nearby.find(
    (h) =>
      h.kind === kind &&
      h.source === "crowd_report" &&
      Date.now() - new Date(h.createdAt).getTime() < DUPLICATE_WINDOW_MS &&
      haversineMeters(h.location, { lat: latNum, lng: lngNum }) <= DUPLICATE_RADIUS_M
  )
  if (dup) {
    return NextResponse.json({ hazard: dup }, { status: 409 })
  }

  const hazard = await store.create({
    kind,
    lat: latNum,
    lng: lngNum,
    note: sanitizeNote(note),
    reporterHash: hash,
  })

  return NextResponse.json({ hazard }, { status: 201 })
}
