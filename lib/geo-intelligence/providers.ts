// lib/geo-intelligence/providers.ts
//
// Provider abstraction. Every provider implements the same
// `searchPlaces()` signature and returns the same `PlaceObservation`
// shape — fusion.ts never needs to know which API a record came
// from. Google Places, Foursquare, and Mapbox all need paid API
// keys; none of this repo's existing behavior depends on them, so
// each provider is skipped (not an error) when its key is unset.
// The OSM/Overpass provider needs no key and is always available,
// so the system degrades to "free-tier only" rather than to
// "broken" when no keys are configured.
//
// SERVER-ONLY: these call out with server-side API keys. Do not
// import this file from client components — use the /api/geo/*
// routes instead.

import type { LatLng, PlaceObservation, ProviderId } from "./types"

export interface SearchParams {
  query?: string
  category?: string
  center: LatLng
  radiusMeters: number
  limit?: number
}

export interface PlaceProvider {
  id: ProviderId
  isConfigured(): boolean
  searchPlaces(params: SearchParams): Promise<PlaceObservation[]>
}

function nowIso(): string {
  return new Date().toISOString()
}

/* =========================================================
   GOOGLE PLACES (Nearby Search / Text Search — New API)
========================================================= */

class GooglePlacesProvider implements PlaceProvider {
  id: ProviderId = "google"

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_PLACES_API_KEY)
  }

  async searchPlaces(params: SearchParams): Promise<PlaceObservation[]> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) return []

    const body: Record<string, unknown> = {
      locationRestriction: {
        circle: {
          center: { latitude: params.center.lat, longitude: params.center.lng },
          radius: params.radiusMeters,
        },
      },
      maxResultCount: Math.min(params.limit ?? 20, 20),
    }

    if (params.query) {
      // Text Search handles free-text queries better than Nearby Search.
      body.textQuery = params.query
    } else if (params.category) {
      body.includedType = params.category
    }

    const endpoint = params.query
      ? "https://places.googleapis.com/v1/places:searchText"
      : "https://places.googleapis.com/v1/places:searchNearby"

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.location,places.types," +
          "places.formattedAddress,places.rating,places.userRatingCount," +
          "places.photos,places.regularOpeningHours,places.currentOpeningHours," +
          "places.internationalPhoneNumber,places.websiteUri,places.priceLevel",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Google Places request failed (${response.status})`)
    }

    const data = await response.json()
    const places: any[] = Array.isArray(data.places) ? data.places : []

    return places.map((place) => ({
      provider: "google" as const,
      providerId: place.id,
      observedAt: nowIso(),
      name: place.displayName?.text ?? "Unnamed place",
      location: {
        lat: place.location?.latitude ?? params.center.lat,
        lng: place.location?.longitude ?? params.center.lng,
      },
      category: place.types?.[0],
      address: place.formattedAddress,
      rating: typeof place.rating === "number" ? place.rating : undefined,
      ratingCount:
        typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
      photos: Array.isArray(place.photos)
        ? place.photos.slice(0, 5).map((p: any) => p.name)
        : [],
      hours: normalizeGoogleHours(place.regularOpeningHours ?? place.currentOpeningHours),
      phone: place.internationalPhoneNumber,
      website: place.websiteUri,
      priceLevel: googlePriceLevelToNumber(place.priceLevel),
      raw: place,
    }))
  }
}

function googlePriceLevelToNumber(level?: string): number | undefined {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  }
  return level ? map[level] : undefined
}

function normalizeGoogleHours(input: any): PlaceObservation["hours"] | undefined {
  if (!input?.periods) return undefined

  const periods = input.periods
    .filter((p: any) => p.open?.day !== undefined && p.open?.hour !== undefined)
    .map((p: any) => ({
      day: p.open.day,
      open: `${String(p.open.hour).padStart(2, "0")}:${String(p.open.minute ?? 0).padStart(2, "0")}`,
      close: p.close
        ? `${String(p.close.hour).padStart(2, "0")}:${String(p.close.minute ?? 0).padStart(2, "0")}`
        : "23:59",
    }))

  return { periods, openNow: input.openNow }
}

/* =========================================================
   FOURSQUARE PLACES API
========================================================= */

class FoursquareProvider implements PlaceProvider {
  id: ProviderId = "foursquare"

  isConfigured(): boolean {
    return Boolean(process.env.FOURSQUARE_API_KEY)
  }

  async searchPlaces(params: SearchParams): Promise<PlaceObservation[]> {
    const apiKey = process.env.FOURSQUARE_API_KEY
    if (!apiKey) return []

    const search = new URLSearchParams({
      ll: `${params.center.lat},${params.center.lng}`,
      radius: String(Math.min(params.radiusMeters, 100000)),
      limit: String(Math.min(params.limit ?? 20, 50)),
      fields:
        "fsq_id,name,geocodes,categories,location,rating,stats,photos,hours,tel,website,price",
    })

    if (params.query) search.set("query", params.query)
    if (params.category) search.set("categories", params.category)

    const response = await fetch(`https://api.foursquare.com/v3/places/search?${search}`, {
      headers: { Authorization: apiKey, Accept: "application/json" },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Foursquare request failed (${response.status})`)
    }

    const data = await response.json()
    const results: any[] = Array.isArray(data.results) ? data.results : []

    return results.map((place) => ({
      provider: "foursquare" as const,
      providerId: place.fsq_id,
      observedAt: nowIso(),
      name: place.name ?? "Unnamed place",
      location: {
        lat: place.geocodes?.main?.latitude ?? params.center.lat,
        lng: place.geocodes?.main?.longitude ?? params.center.lng,
      },
      category: place.categories?.[0]?.name,
      address: place.location?.formatted_address,
      rating: typeof place.rating === "number" ? place.rating / 2 : undefined, // FSQ is 0-10
      ratingCount: place.stats?.total_ratings,
      photos: Array.isArray(place.photos)
        ? place.photos.slice(0, 5).map((p: any) => `${p.prefix}original${p.suffix}`)
        : [],
      hours: normalizeFoursquareHours(place.hours),
      phone: place.tel,
      website: place.website,
      priceLevel: typeof place.price === "number" ? place.price - 1 : undefined, // FSQ is 1-4
      raw: place,
    }))
  }
}

function normalizeFoursquareHours(input: any): PlaceObservation["hours"] | undefined {
  if (!input?.regular) return undefined

  const periods = input.regular.map((p: any) => ({
    day: p.day % 7, // FSQ: 1=Monday..7=Sunday -> normalize to 0=Sunday
    open: `${p.open.slice(0, 2)}:${p.open.slice(2)}`,
    close: `${p.close.slice(0, 2)}:${p.close.slice(2)}`,
  }))

  return { periods, openNow: input.open_now }
}

/* =========================================================
   MAPBOX SEARCH BOX API
========================================================= */

class MapboxProvider implements PlaceProvider {
  id: ProviderId = "mapbox"

  isConfigured(): boolean {
    return Boolean(process.env.MAPBOX_ACCESS_TOKEN)
  }

  async searchPlaces(params: SearchParams): Promise<PlaceObservation[]> {
    const token = process.env.MAPBOX_ACCESS_TOKEN
    if (!token) return []

    const search = new URLSearchParams({
      q: params.query ?? params.category ?? "place",
      proximity: `${params.center.lng},${params.center.lat}`,
      limit: String(Math.min(params.limit ?? 10, 10)),
      access_token: token,
    })

    const response = await fetch(
      `https://api.mapbox.com/search/searchbox/v1/forward?${search}`,
      { cache: "no-store" }
    )

    if (!response.ok) {
      throw new Error(`Mapbox Search request failed (${response.status})`)
    }

    const data = await response.json()
    const features: any[] = Array.isArray(data.features) ? data.features : []

    return features.map((feature) => ({
      provider: "mapbox" as const,
      providerId: feature.properties?.mapbox_id ?? feature.id,
      observedAt: nowIso(),
      name: feature.properties?.name ?? "Unnamed place",
      location: {
        lat: feature.geometry?.coordinates?.[1] ?? params.center.lat,
        lng: feature.geometry?.coordinates?.[0] ?? params.center.lng,
      },
      category: feature.properties?.poi_category?.[0],
      address: feature.properties?.full_address,
      phone: feature.properties?.metadata?.phone,
      website: feature.properties?.metadata?.website,
      raw: feature,
    }))
  }
}

/* =========================================================
   OPENSTREETMAP / OVERPASS — free, keyless, always-on fallback

   Mirrors the tag filters already proven out in
   app/api/places/route.ts. This is what keeps the whole system
   functional with zero configuration and zero cost, which matters
   a great deal in Ghana specifically: paid providers have real,
   uneven coverage gaps outside Accra/Kumasi, while OSM's Ghana
   coverage has been actively built up by local mapping communities
   (e.g. the Ghana OSM community, HOT OSM tasks) for over a decade.
========================================================= */

const OSM_CATEGORY_TAGS: Record<string, { key: string; value?: string }[]> = {
  restaurant: [{ key: "amenity", value: "restaurant" }],
  cafe: [{ key: "amenity", value: "cafe" }],
  fast_food: [{ key: "amenity", value: "fast_food" }],
  bar: [{ key: "amenity", value: "bar" }, { key: "amenity", value: "pub" }],
  shop: [{ key: "shop" }],
  supermarket: [{ key: "shop", value: "supermarket" }],
  bank: [{ key: "amenity", value: "bank" }],
  atm: [{ key: "amenity", value: "atm" }],
  fuel: [{ key: "amenity", value: "fuel" }],
  hotel: [{ key: "tourism", value: "hotel" }],
  hospital: [{ key: "amenity", value: "hospital" }],
  pharmacy: [{ key: "amenity", value: "pharmacy" }],
  school: [{ key: "amenity", value: "school" }],
  place_of_worship: [{ key: "amenity", value: "place_of_worship" }],
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
]

class OsmProvider implements PlaceProvider {
  id: ProviderId = "osm"

  isConfigured(): boolean {
    return true // no key needed, always available
  }

  async searchPlaces(params: SearchParams): Promise<PlaceObservation[]> {
    const tags = params.category ? OSM_CATEGORY_TAGS[params.category] : undefined
    const filters = tags ?? [{ key: "name", value: params.query ? undefined : undefined }]

    const clauses = (tags ?? [{ key: "amenity" }, { key: "shop" }])
      .map(({ key, value }) => {
        const tag = value ? `"${key}"="${value}"` : `"${key}"`
        return (
          `  node[${tag}](around:${params.radiusMeters},${params.center.lat},${params.center.lng});\n` +
          `  way[${tag}](around:${params.radiusMeters},${params.center.lat},${params.center.lng});\n`
        )
      })
      .join("")

    const query = `[out:json][timeout:20];\n(\n${clauses});\nout center ${
      params.limit ?? 40
    };`

    let lastError: unknown
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          cache: "no-store",
        })

        if (!response.ok) throw new Error(`Overpass failed (${response.status})`)

        const data = await response.json()
        const elements: any[] = Array.isArray(data.elements) ? data.elements : []

        return elements
          .map((el): PlaceObservation | null => {
            const tags = el.tags ?? {}
            const lat = el.lat ?? el.center?.lat
            const lng = el.lon ?? el.center?.lon
            if (typeof lat !== "number" || typeof lng !== "number") return null

            return {
              provider: "osm",
              providerId: `${el.type}/${el.id}`,
              observedAt: nowIso(),
              name: tags.name ?? params.category ?? "Unnamed place",
              location: { lat, lng },
              category: params.category,
              address: [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]]
                .filter(Boolean)
                .join(" "),
              phone: tags.phone ?? tags["contact:phone"],
              website: tags.website ?? tags["contact:website"],
              raw: el,
            }
          })
          .filter((p): p is PlaceObservation => p !== null)
      } catch (error) {
        lastError = error
        continue
      }
    }

    throw lastError instanceof Error ? lastError : new Error("All Overpass mirrors failed.")
  }
}

/* =========================================================
   REGISTRY
========================================================= */

export const PROVIDERS: PlaceProvider[] = [
  new GooglePlacesProvider(),
  new FoursquareProvider(),
  new MapboxProvider(),
  new OsmProvider(),
]

export function configuredProviders(): PlaceProvider[] {
  return PROVIDERS.filter((p) => p.isConfigured())
}
