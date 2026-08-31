// lib/geocoding.ts
//
// Shared client-side helper for search / reverse-geocoding / nearby
// places. Talks to our own /api/geocode and /api/places routes
// (see those files for why this isn't calling Nominatim/Overpass
// directly from the browser anymore).

export interface GeocodeResult {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: string
  importance?: number
  // Present when /api/places served this result from Google Places
  // (see app/api/places/route.ts) rather than the free OSM/Overpass
  // fallback — undefined for OSM results, which don't have ratings.
  rating?: number
  ratingCount?: number
}

export type Place = GeocodeResult

/* =========================================================
   FAST-PATH: WELL-KNOWN GHANA LOCATIONS

   Kept as a quick, offline-friendly shortcut for common local
   neighborhoods that free geocoders sometimes rank poorly —
   NOT as a restriction. Anything not in this table just falls
   through to the geocoder, anywhere in the world.
========================================================= */

const GHANA_LOCATIONS: Record<string, [number, number]> = {
  accra: [5.6037, -0.187],
  "accra central": [5.6037, -0.187],
  madina: [5.6833, -0.1667],
  "madina accra": [5.6833, -0.1667],
  adenta: [5.7142, -0.1542],
  legon: [5.6508, -0.1869],
  "legon accra": [5.6508, -0.1869],
  osu: [5.5573, -0.1864],
  spintex: [5.6362, -0.1289],
  achimota: [5.6131, -0.2296],
  kasoa: [5.5345, -0.4168],
  tema: [5.6698, -0.0166],
  kwabenya: [5.7156, -0.2333],
  "kwabenya accra": [5.7156, -0.2333],
  "kwabenya, accra": [5.7156, -0.2333],
  dansoman: [5.5578, -0.2491],
  kaneshie: [5.5719, -0.2356],
  lapaz: [5.6048, -0.2457],
  "north kaneshie": [5.586, -0.238],
  teshie: [5.583, -0.105],
  nungua: [5.598, -0.078],
  "east legon": [5.638, -0.166],
  "airport city": [5.605, -0.171],
  "osu oxford street": [5.556, -0.182],
  kumasi: [6.6885, -1.6244],
  takoradi: [4.9016, -1.7554],
  "cape coast": [5.1053, -1.2466],
  tamale: [9.4075, -0.8393],
  koforidua: [6.0941, -0.2591],
  sunyani: [7.3399, -2.3266],
  ho: [6.6008, 0.4713],
  wa: [10.0601, -2.5019],
  bolgatanga: [10.7856, -0.8514],
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ")
}

/**
 * Returns [lat, lng] for a well-known Ghanaian place name, or
 * null if the query isn't in the fast-path table.
 */
export function getKnownGhanaLocation(
  query: string
): [number, number] | null {
  const normalized = normalizeQuery(query).toLowerCase()

  if (GHANA_LOCATIONS[normalized]) {
    return GHANA_LOCATIONS[normalized]
  }

  const simplified = normalized
    .replace(/,?\s*ghana$/i, "")
    .replace(/,?\s*accra$/i, "")
    .trim()

  return GHANA_LOCATIONS[simplified] ?? null
}

/**
 * Forward geocode a free-text query. Works for any location in
 * the world; Ghana results are biased (ranked higher) but never
 * excluded.
 */
export async function geocode(
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {}
): Promise<GeocodeResult[]> {
  const cleaned = normalizeQuery(query)

  if (!cleaned) return []

  const params = new URLSearchParams({ q: cleaned })

  if (options.limit) {
    params.set("limit", String(options.limit))
  }

  const response = await fetch(`/api/geocode?${params.toString()}`, {
    signal: options.signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || "Could not search for that place.")
  }

  const data = await response.json()

  return Array.isArray(data.results) ? data.results : []
}

/**
 * Reverse geocode a coordinate into a human-readable place.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  })

  const response = await fetch(`/api/geocode?${params.toString()}`, {
    signal,
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()

  return data.result ?? null
}

/**
 * Geocode a query, preferring the Ghana fast-path table, then
 * falling back to the live geocoder. Returns [lat, lng] or null.
 */
export async function geocodeToCoordinates(
  query: string,
  signal?: AbortSignal
): Promise<[number, number] | null> {
  const known = getKnownGhanaLocation(query)

  if (known) {
    return known
  }

  const results = await geocode(query, { limit: 5, signal })

  const best = results[0]

  return best ? [best.lat, best.lng] : null
}

/**
 * Find nearby points of interest for a category around a center
 * point (lat, lng radius in meters).
 */
export async function searchNearbyPlaces(
  category: string,
  center: [number, number],
  radiusMeters = 8000,
  signal?: AbortSignal
): Promise<Place[]> {
  const params = new URLSearchParams({
    category,
    lat: String(center[0]),
    lng: String(center[1]),
    radius: String(radiusMeters),
  })

  const response = await fetch(`/api/places?${params.toString()}`, {
    signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(
      body?.error || "Could not load nearby places."
    )
  }

  const data = await response.json()

  return Array.isArray(data.places) ? data.places : []
}
