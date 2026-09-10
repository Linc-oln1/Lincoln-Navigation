// lib/hazard-feeds/gdacs.ts  (server only)
//
// GDACS — the Global Disaster Alert and Coordination System, run by
// UN OCHA and the EC Joint Research Centre. Its flood alerts are
// official but coarse: a whole river basin or region, marked at a
// centroid, not a street. So this feed is:
//
//   - env-gated OFF by default (HAZARD_FEED_GDACS=on) — a region-
//     centroid pin on a turn-by-turn map is borderline noise, so
//     it's the owner's call whether to show it;
//   - rendered as an advisory only. Nothing from source "official"
//     is ever allowed to drive route warnings or rerouting (see the
//     filter in the directions panel / live-nav hook) — a GDACS
//     centroid landing on your route is meaningless.
//
// Keyless. https://www.gdacs.org/gdacsapi/

import type { Hazard } from "@/lib/hazards"
import type { HazardFeed } from "./types"

// Rough Ghana bounding box — a belt-and-braces check alongside the
// per-event affectedcountries list.
const GHANA_BBOX = { minLng: -3.3, minLat: 4.5, maxLng: 1.3, maxLat: 11.3 }

const CACHE_TTL_MS = 60 * 60 * 1000
// Cap how far out a perpetually-"current" event is shown.
const MAX_LIFETIME_MS = 5 * 24 * 60 * 60 * 1000

interface CacheEntry {
  expires: number
  data: Hazard[]
}
let cache: CacheEntry | null = null

function isConfigured(): boolean {
  return process.env.HAZARD_FEED_GDACS === "on"
}

function severityFromAlert(level: string): number {
  const l = String(level).toLowerCase()
  if (l === "red") return 0.85
  if (l === "orange") return 0.6
  return 0.4 // green / unknown
}

function touchesGhana(feature: any): boolean {
  const affected: any[] = feature?.properties?.affectedcountries ?? []
  if (
    affected.some((c) => c?.iso3 === "GHA") ||
    feature?.properties?.iso3 === "GHA"
  ) {
    return true
  }
  const [lng, lat] = feature?.geometry?.coordinates ?? []
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= GHANA_BBOX.minLng &&
    lng <= GHANA_BBOX.maxLng &&
    lat >= GHANA_BBOX.minLat &&
    lat <= GHANA_BBOX.maxLat
  )
}

function toHazard(feature: any): Hazard | null {
  const p = feature?.properties ?? {}
  const [lng, lat] = feature?.geometry?.coordinates ?? []
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null

  const now = Date.now()
  const isCurrent = String(p.iscurrent) === "true"
  const from = p.fromdate ? new Date(p.fromdate).getTime() : now
  const toRaw = p.todate ? new Date(p.todate).getTime() : NaN

  let expires: number
  if (Number.isFinite(toRaw) && toRaw > now) {
    // A real future end date.
    expires = Math.min(toRaw, now + MAX_LIFETIME_MS)
  } else if (isCurrent) {
    // Ongoing beyond its forecast window — keep it, but capped.
    expires = now + MAX_LIFETIME_MS
  } else {
    // Over and not flagged current.
    return null
  }

  const level = p.alertlevel ?? "Green"
  return {
    id: `gdacs-${p.eventid}`,
    kind: "flood",
    location: { lat, lng },
    note: `${p.name || "Flood alert"} — GDACS ${level} regional flood alert`,
    source: "official",
    url: p.url?.report,
    createdAt: new Date(Number.isFinite(from) ? from : now).toISOString(),
    expiresAt: new Date(Math.max(expires, now + 60_000)).toISOString(),
    confirmedCount: 0,
    clearedCount: 0,
    severity: severityFromAlert(level),
    status: "active",
  }
}

async function fetchGdacsHazards(): Promise<Hazard[]> {
  if (cache && cache.expires > Date.now()) return cache.data

  let data: Hazard[] = []
  try {
    const res = await fetch(
      "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&alertlevel=Orange;Red",
      { cache: "no-store", signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) throw new Error(`GDACS request failed (${res.status})`)

    const body = await res.json()
    const features: any[] = Array.isArray(body?.features) ? body.features : []

    data = features
      .filter((f) => f?.properties?.eventtype === "FL" && touchesGhana(f))
      .map(toHazard)
      .filter((h): h is Hazard => h !== null)
  } catch (error) {
    console.error("[gdacs] lookup failed:", error)
    data = []
  }

  cache = { expires: Date.now() + CACHE_TTL_MS, data }
  return data
}

export const gdacsFeed: HazardFeed = {
  id: "gdacs",
  label: "GDACS — UN/EC official disaster alerts",
  isConfigured,
  fetch: fetchGdacsHazards,
}
