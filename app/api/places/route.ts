import { NextRequest, NextResponse } from "next/server"

/* =========================================================
   NEARBY PLACES (POI) PROXY

   PREVIOUSLY: places-panel.tsx queried the Overpass API
   directly from the browser, and — for several categories —
   with tag combinations that don't exist in OpenStreetMap at
   all. For example "Shopping" queried
   amenity=shop / tourism=shop / shop=shop, none of which are
   real tags, so that category silently returned nothing and
   the code fell back to a FAKE placeholder POI ("Sample
   shop") instead of a real place. Only OSM nodes were
   queried too, so shops/hotels/etc. mapped as ways (most
   large buildings) were invisible.

   THEN: this route proxied to Overpass only, with correct tag
   filters per category, ways/relations included, and a mirror
   on failure. That's free and keyless, but it's still a shared
   public resource — it returns real (if occasionally spotty)
   OpenStreetMap data, but no ratings, no hours, no photos, and
   occasional 5xx overload on the busiest mirror.

   NOW: when GOOGLE_PLACES_API_KEY is set in .env.local, this
   route queries the Google Places API (New) Nearby Search
   endpoint FIRST — real, actively-maintained business listings
   with ratings, review counts, and opening hours — and only
   falls back to the free Overpass/OSM path above if the key is
   unset or the Google request fails. This mirrors the same
   "paid provider first, free provider as a safety net" pattern
   already used by /api/geocode (Mapbox → Nominatim), so the app
   never breaks just because a key isn't configured — Google is
   an upgrade, never a requirement.

   To turn this on: add GOOGLE_PLACES_API_KEY=... to .env.local
   (a key from a Google Cloud project with the "Places API (New)"
   enabled — the same key already documented for the geo-
   intelligence layer in lib/geo-intelligence/providers.ts).
   .env.local writes are blocked from this side of the device
   bridge for security, so that line has to be pasted in on your
   own machine.
========================================================= */

interface CategoryFilter {
  key: string
  value?: string
}

const CATEGORY_FILTERS: Record<string, CategoryFilter[]> = {
  restaurant: [{ key: "amenity", value: "restaurant" }],
  cafe: [{ key: "amenity", value: "cafe" }],
  fast_food: [{ key: "amenity", value: "fast_food" }],
  bar: [
    { key: "amenity", value: "bar" },
    { key: "amenity", value: "pub" },
  ],
  shop: [{ key: "shop" }],
  supermarket: [{ key: "shop", value: "supermarket" }],
  bank: [{ key: "amenity", value: "bank" }],
  atm: [{ key: "amenity", value: "atm" }],
  fuel: [{ key: "amenity", value: "fuel" }],
  hotel: [{ key: "tourism", value: "hotel" }],
  tourism: [{ key: "tourism" }],
  park: [{ key: "leisure", value: "park" }],
  university: [
    { key: "amenity", value: "university" },
    { key: "amenity", value: "college" },
  ],
  hospital: [{ key: "amenity", value: "hospital" }],
  pharmacy: [{ key: "amenity", value: "pharmacy" }],
  school: [{ key: "amenity", value: "school" }],
  parking: [{ key: "amenity", value: "parking" }],
  place_of_worship: [{ key: "amenity", value: "place_of_worship" }],
  cinema: [{ key: "amenity", value: "cinema" }],
  gym: [{ key: "leisure", value: "fitness_centre" }],
  airport: [{ key: "aeroway", value: "aerodrome" }],
}

// Google Places API (New) "included type" values for each of our
// category keys. Deliberately restricted to type strings that have
// been stable since the original (pre-"New") Places API, rather
// than the newer, larger type list — searchNearby validates every
// included type up front and rejects the WHOLE request if even one
// is unrecognized, so a category with a shaky/uncertain type string
// would silently break Google lookups for that category alone.
// Multiple types per category (e.g. "bar" also matching
// night_club) mirror the same idea as CATEGORY_FILTERS's arrays of
// OSM tags above.
const GOOGLE_TYPES_FOR_CATEGORY: Record<string, string[]> = {
  restaurant: ["restaurant"],
  cafe: ["cafe"],
  fast_food: ["meal_takeaway"],
  bar: ["bar", "night_club"],
  shop: ["store", "shopping_mall"],
  supermarket: ["supermarket"],
  bank: ["bank"],
  atm: ["atm"],
  fuel: ["gas_station"],
  hotel: ["lodging"],
  tourism: ["tourist_attraction"],
  park: ["park"],
  university: ["university"],
  hospital: ["hospital"],
  pharmacy: ["pharmacy"],
  school: ["school"],
  parking: ["parking"],
  // The New API has no single generic "place of worship" type —
  // it splits the old catch-all into per-religion types.
  place_of_worship: ["church", "mosque", "synagogue", "hindu_temple"],
  cinema: ["movie_theater"],
  gym: ["gym"],
  airport: ["airport"],
}

// The main overpass-api.de instance in particular is a free, shared
// public resource that returns transient 5xx errors under load
// fairly often — not a sign anything here is broken. More mirrors
// (and the retry-on-5xx below) make a real outage far less likely
// to reach the user as a visible failure.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
]

interface CacheEntry {
  expires: number
  data: unknown
}

const CACHE_TTL_MS = 3 * 60 * 1000
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

  if (cache.size > 200) {
    const oldestKey = cache.keys().next().value

    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }
}

function buildQuery(
  filters: CategoryFilter[],
  lat: number,
  lng: number,
  radius: number,
  limit: number
): string {
  const clauses = filters
    .map(({ key, value }) => {
      const tag = value ? `"${key}"="${value}"` : `"${key}"`

      return (
        `  node[${tag}](around:${radius},${lat},${lng});\n` +
        `  way[${tag}](around:${radius},${lat},${lng});\n`
      )
    })
    .join("")

  return (
    `[out:json][timeout:20];\n` +
    `(\n${clauses});\n` +
    `out center ${limit};`
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function queryOverpassOnce(
  endpoint: string,
  query: string
): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: controller.signal,
      cache: "no-store",
    })

    if (!response.ok) {
      const error = new Error(
        `Overpass request failed (${response.status})`
      )
      ;(error as any).status = response.status
      throw error
    }

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

// A 5xx from Overpass is almost always transient overload on that
// particular free public instance, not a problem with our query —
// worth one quick retry before writing the whole endpoint off and
// moving to the next mirror. A 4xx means the query itself is bad,
// which a retry (or a different mirror) won't fix.
function isRetryableOverpassError(error: unknown): boolean {
  const status = (error as any)?.status
  if (typeof status === "number") return status >= 500
  // Network errors / aborts from the timeout above have no status
  // and are just as likely to be transient — worth retrying too.
  return true
}

async function queryOverpass(query: string): Promise<any> {
  let lastError: unknown = null

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await queryOverpassOnce(endpoint, query)
      } catch (error) {
        lastError = error

        if (attempt === 0 && isRetryableOverpassError(error)) {
          await sleep(400)
          continue
        }

        break
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Overpass endpoints failed.")
}

function labelFor(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatAddress(tags: Record<string, string>): string {
  const parts = [
    tags["addr:housenumber"] && tags["addr:street"]
      ? `${tags["addr:housenumber"]} ${tags["addr:street"]}`
      : tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : "Unnamed road"
}

interface NearbyPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type: string
  rating?: number
  ratingCount?: number
}

function getGooglePlacesApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY
  return key && key.trim() ? key.trim() : null
}

async function queryGooglePlaces(
  category: string,
  lat: number,
  lng: number,
  radius: number,
  limit: number,
  apiKey: string
): Promise<NearbyPlace[]> {
  const includedTypes = GOOGLE_TYPES_FOR_CATEGORY[category]

  // No confident type mapping for this category — rather than send
  // Google a guess that might get the whole request rejected, skip
  // straight to the Overpass path for it.
  if (!includedTypes) {
    throw new Error(
      `No Google Places type mapping for category "${category}".`
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  let response: Response
  try {
    response = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.location," +
            "places.formattedAddress,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: Math.min(limit, 20), // Nearby Search (New) caps at 20
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              // Nearby Search (New) caps the search radius at 50km.
              radius: Math.min(radius, 50000),
            },
          },
        }),
        signal: controller.signal,
        cache: "no-store",
      }
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(
      body?.error?.message || `Google Places request failed (${response.status})`
    )
  }

  const data = await response.json()
  const places: any[] = Array.isArray(data.places) ? data.places : []

  const seen = new Set<string>()

  return places
    .map((place): NearbyPlace | null => {
      const placeLat = place.location?.latitude
      const placeLng = place.location?.longitude

      if (
        typeof placeLat !== "number" ||
        typeof placeLng !== "number"
      ) {
        return null
      }

      const name = place.displayName?.text || labelFor(category)
      const key = `${name}:${placeLat.toFixed(4)}:${placeLng.toFixed(4)}`

      if (seen.has(key)) return null
      seen.add(key)

      return {
        id: `google-${place.id}`,
        name,
        address: place.formattedAddress || "Unnamed road",
        lat: placeLat,
        lng: placeLng,
        type: category,
        rating: typeof place.rating === "number" ? place.rating : undefined,
        ratingCount:
          typeof place.userRatingCount === "number"
            ? place.userRatingCount
            : undefined,
      }
    })
    .filter((place): place is NearbyPlace => place !== null)
    .slice(0, limit)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const category = searchParams.get("category")?.trim()
  const lat = Number.parseFloat(searchParams.get("lat") || "")
  const lng = Number.parseFloat(searchParams.get("lng") || "")
  const radius = Math.min(
    Math.max(
      Number.parseInt(searchParams.get("radius") || "8000", 10) ||
        8000,
      500
    ),
    50000
  )
  const limit = Math.min(
    Math.max(
      Number.parseInt(searchParams.get("limit") || "40", 10) || 40,
      1
    ),
    100
  )

  if (!category || !CATEGORY_FILTERS[category]) {
    return NextResponse.json(
      {
        error: `Unknown or missing category. Supported: ${Object.keys(
          CATEGORY_FILTERS
        ).join(", ")}`,
      },
      { status: 400 }
    )
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Missing or invalid lat/lng." },
      { status: 400 }
    )
  }

  const cacheKey = `${category}:${lat.toFixed(3)}:${lng.toFixed(
    3
  )}:${radius}`

  const cached = getCached(cacheKey)

  if (cached) {
    return NextResponse.json(cached)
  }

  const googleApiKey = getGooglePlacesApiKey()

  if (googleApiKey) {
    try {
      const places = await queryGooglePlaces(
        category,
        lat,
        lng,
        radius,
        limit,
        googleApiKey
      )

      const result = { places, source: "google" as const }

      setCached(cacheKey, result)

      return NextResponse.json(result)
    } catch (error) {
      // A Google failure (bad/missing billing, quota exceeded, an
      // unmapped category, a transient outage) should never take
      // the feature down — fall through to the free Overpass path
      // below exactly like /api/geocode falls through to Nominatim
      // when Mapbox fails. This is a real, expected fallback path,
      // not a bug, so it's a warn rather than an error.
      console.warn(
        "[places] Google Places failed, falling back to Overpass:",
        error
      )
    }
  }

  try {
    const query = buildQuery(
      CATEGORY_FILTERS[category],
      lat,
      lng,
      radius,
      limit
    )

    const data = await queryOverpass(query)

    const elements: any[] = Array.isArray(data?.elements)
      ? data.elements
      : []

    const seen = new Set<string>()

    const places = elements
      .map((element) => {
        const tags = element.tags || {}

        const elementLat =
          element.lat ?? element.center?.lat
        const elementLng =
          element.lon ?? element.center?.lon

        if (
          typeof elementLat !== "number" ||
          typeof elementLng !== "number"
        ) {
          return null
        }

        const name = tags.name || labelFor(category)

        const key = `${name}:${elementLat.toFixed(
          4
        )}:${elementLng.toFixed(4)}`

        if (seen.has(key)) {
          return null
        }

        seen.add(key)

        return {
          id: `${element.type}-${element.id}`,
          name,
          address: formatAddress(tags),
          lat: elementLat,
          lng: elementLng,
          type: category,
        }
      })
      .filter(
        (place): place is NonNullable<typeof place> =>
          place !== null
      )
      .slice(0, limit)

    const result = { places, source: "osm" as const }

    setCached(cacheKey, result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[places] error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nearby places request failed. Please try again.",
      },
      { status: 502 }
    )
  }
}
