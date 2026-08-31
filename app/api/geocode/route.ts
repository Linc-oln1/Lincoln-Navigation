import { NextRequest, NextResponse } from "next/server"

/* =========================================================
   GEOCODING PROXY

   PREVIOUSLY: search-panel.tsx and directions-panel.tsx each
   called Nominatim (or a hard-coded-but-unset Mapbox token)
   directly from the browser. That:

     - broke CORS/reliability for some users
     - violated Nominatim's usage policy (no identifying
       User-Agent, no request pacing)
     - hard-restricted every result to Ghana, so places
       anywhere else on the map could never be found
     - duplicated the same fetch/parcatch logic in three
       different components

   NOW: everything goes through this single server route,
   which talks to Nominatim with a proper User-Agent, caches
   results briefly, and biases (rather than restricts)
   results toward Ghana.

   MAPBOX TOKEN: location search now depends on MAPBOX_ACCESS_TOKEN
   when one is set in .env.local — the same variable already used
   by lib/geo-intelligence/providers.ts. When the token is present,
   every search and reverse-geocode here is served by Mapbox's
   Geocoding API (v6) instead of Nominatim, which is generally more
   reliable and better-covered. When the token is absent (or a
   Mapbox request fails), this falls straight back to the free
   Nominatim path below rather than breaking search entirely — a
   Mapbox token is an upgrade, never a requirement, for the app to
   keep working.
========================================================= */

type NormalizedResult = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: string
  importance?: number
}

// Accra, used only as a soft ranking bias (never a restriction) so
// nearby results surface first without excluding anywhere else.
const GHANA_CENTER: [number, number] = [-0.187, 5.6037] // [lng, lat]

function getMapboxToken(): string | null {
  const token = process.env.MAPBOX_ACCESS_TOKEN
  return token && token.trim() ? token.trim() : null
}

function normalizeMapboxFeature(feature: any): NormalizedResult {
  const [lng, lat] = feature.geometry?.coordinates ?? [0, 0]
  const props = feature.properties ?? {}

  return {
    id: `mapbox-${props.mapbox_id ?? feature.id}`,
    name: props.name || props.name_preferred || props.place_formatted || "Unnamed place",
    address: props.full_address || props.place_formatted || props.name || "",
    lat,
    lng,
    type: props.feature_type,
    importance: props.match_code?.confidence === "exact" ? 1 : undefined,
  }
}

async function mapboxForwardGeocode(
  query: string,
  limit: number,
  token: string
): Promise<NormalizedResult[]> {
  const params = new URLSearchParams({
    q: query,
    access_token: token,
    limit: String(Math.min(limit, 10)), // Mapbox v6 forward caps at 10
    language: "en",
    proximity: `${GHANA_CENTER[0]},${GHANA_CENTER[1]}`,
  })

  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed (${response.status})`)
  }

  const data = await response.json()
  const features: any[] = Array.isArray(data.features) ? data.features : []

  return features.map(normalizeMapboxFeature)
}

async function mapboxReverseGeocode(
  lat: string,
  lng: string,
  token: string
): Promise<NormalizedResult | null> {
  const params = new URLSearchParams({
    longitude: lng,
    latitude: lat,
    access_token: token,
    language: "en",
  })

  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Mapbox reverse geocoding failed (${response.status})`)
  }

  const data = await response.json()
  const features: any[] = Array.isArray(data.features) ? data.features : []

  return features.length > 0 ? normalizeMapboxFeature(features[0]) : null
}

interface CacheEntry {
  expires: number
  data: unknown
}

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, CacheEntry>()

function getCached(key: string) {
  const entry = cache.get(key)

  if (!entry) return undefined

  if (entry.expires < Date.now()) {
    cache.delete(key)
    return undefined
  }

  return entry.data
}

function setCached(key: string, data: unknown) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data })

  // Keep the cache from growing without bound in a
  // long-lived server process.
  if (cache.size > 500) {
    const oldestKey = cache.keys().next().value

    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }
}

function getNominatimBaseUrl(): string {
  const configured = process.env.NOMINATIM_URL

  if (configured && configured.trim()) {
    return configured.trim().replace(/\/+$/, "")
  }

  return "https://nominatim.openstreetmap.org"
}

function getUserAgent(): string {
  const appName =
    process.env.NEXT_PUBLIC_APP_NAME || "Lincoln Navigation"

  return `${appName}/1.0 (self-hosted map app; contact: not-provided)`
}

// Ghana bounding box, used only to bias ranking (bounded=0),
// never to exclude results from elsewhere.
const GHANA_VIEWBOX = "-3.5,11.4,1.5,4.4" // left,top,right,bottom

interface NominatimResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  name?: string
  type?: string
  class?: string
  importance?: number
  address?: Record<string, string>
}

function normalizeResult(item: NominatimResult) {
  const name =
    item.name ||
    item.display_name.split(",")[0]?.trim() ||
    item.display_name

  return {
    id: `osm-${item.place_id}`,
    name,
    address: item.display_name,
    lat: Number.parseFloat(item.lat),
    lng: Number.parseFloat(item.lon),
    type: item.type || item.class,
    importance: item.importance,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const query = searchParams.get("q")?.trim()
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const limitParam = Number.parseInt(
    searchParams.get("limit") || "8",
    10
  )
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 20)
    : 8

  const base = getNominatimBaseUrl()
  const headers = {
    "User-Agent": getUserAgent(),
    Accept: "application/json",
    "Accept-Language": "en",
  }
  const mapboxToken = getMapboxToken()

  try {
    /* -----------------------------------------------------
       REVERSE GEOCODING
    ----------------------------------------------------- */
    if (lat && lng) {
      const cacheKey = `reverse:${lat},${lng}`
      const cached = getCached(cacheKey)

      if (cached) {
        return NextResponse.json(cached)
      }

      if (mapboxToken) {
        try {
          const mapboxResult = await mapboxReverseGeocode(lat, lng, mapboxToken)
          const result = { result: mapboxResult }
          setCached(cacheKey, result)
          return NextResponse.json(result)
        } catch (error) {
          console.error(
            "[geocode] Mapbox reverse geocoding failed, falling back to Nominatim:",
            error
          )
          // fall through to Nominatim below
        }
      }

      const params = new URLSearchParams({
        lat,
        lon: lng,
        format: "jsonv2",
        addressdetails: "1",
        zoom: "18",
      })

      const response = await fetch(
        `${base}/reverse?${params.toString()}`,
        { headers, cache: "no-store" }
      )

      if (!response.ok) {
        throw new Error(
          `Reverse geocoding failed (${response.status})`
        )
      }

      const data = await response.json()

      if (data.error) {
        const result = { result: null }
        setCached(cacheKey, result)
        return NextResponse.json(result)
      }

      const result = {
        result: normalizeResult(data as NominatimResult),
      }

      setCached(cacheKey, result)
      return NextResponse.json(result)
    }

    /* -----------------------------------------------------
       FORWARD GEOCODING
    ----------------------------------------------------- */
    if (!query) {
      return NextResponse.json(
        { error: "Missing q, or lat+lng, query parameter." },
        { status: 400 }
      )
    }

    const cacheKey = `forward:${query.toLowerCase()}:${limit}`
    const cached = getCached(cacheKey)

    if (cached) {
      return NextResponse.json(cached)
    }

    if (mapboxToken) {
      try {
        const mapboxResults = await mapboxForwardGeocode(query, limit, mapboxToken)
        const results = { results: mapboxResults }
        setCached(cacheKey, results)
        return NextResponse.json(results)
      } catch (error) {
        console.error("[geocode] Mapbox geocoding failed, falling back to Nominatim:", error)
        // fall through to Nominatim below
      }
    }

    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      limit: String(limit),
      viewbox: GHANA_VIEWBOX,
      bounded: "0", // bias toward Ghana, never exclude elsewhere
    })

    const response = await fetch(
      `${base}/search?${params.toString()}`,
      { headers, cache: "no-store" }
    )

    if (!response.ok) {
      throw new Error(`Geocoding failed (${response.status})`)
    }

    const data = (await response.json()) as NominatimResult[]

    const results = {
      results: Array.isArray(data)
        ? data.map(normalizeResult)
        : [],
    }

    setCached(cacheKey, results)
    return NextResponse.json(results)
  } catch (error) {
    console.error("[geocode] error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Geocoding request failed.",
      },
      { status: 502 }
    )
  }
}
