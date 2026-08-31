import { NextRequest, NextResponse } from "next/server"
import { configuredProviders } from "@/lib/geo-intelligence/providers"
import { fusePlaces } from "@/lib/geo-intelligence/fusion"
import type { PlaceObservation } from "@/lib/geo-intelligence/types"

/* =========================================================
   UNIFIED PLACE SEARCH — the "PLACE INTEL" + "EVIDENCE FUSION"
   stages from the architecture: queries every configured provider
   (Google Places / Foursquare / Mapbox / OSM) in parallel, fuses
   the results into canonical places with a transparent confidence
   score, and returns them ranked by confidence.

   With no paid keys configured, this transparently runs on OSM
   alone — same endpoint, same response shape, just fewer sources
   agreeing (visible directly in each place's confidence.providerCount).

   This is additive: existing /api/places and lib/geocoding.ts are
   untouched, so nothing currently wired to them breaks. Point new
   or updated UI at this endpoint to get fused, confidence-scored
   results instead of raw single-source ones.
========================================================= */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const query = searchParams.get("q")?.trim() || undefined
  const category = searchParams.get("category")?.trim() || undefined
  const lat = Number.parseFloat(searchParams.get("lat") || "")
  const lng = Number.parseFloat(searchParams.get("lng") || "")
  const radius = Math.min(
    Math.max(Number.parseInt(searchParams.get("radius") || "5000", 10) || 5000, 200),
    50000
  )
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
    50
  )

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Missing or invalid lat/lng." }, { status: 400 })
  }

  if (!query && !category) {
    return NextResponse.json({ error: "Provide either q or category." }, { status: 400 })
  }

  const providers = configuredProviders()
  const center = { lat, lng }

  const results = await Promise.allSettled(
    providers.map((provider) =>
      provider.searchPlaces({ query, category, center, radiusMeters: radius, limit })
    )
  )

  const observations: PlaceObservation[] = []
  const providerErrors: Record<string, string> = {}

  results.forEach((result, i) => {
    const providerId = providers[i].id
    if (result.status === "fulfilled") {
      observations.push(...result.value)
    } else {
      providerErrors[providerId] =
        result.reason instanceof Error ? result.reason.message : "Unknown error"
      console.error(`[geo/search] ${providerId} failed:`, result.reason)
    }
  })

  const places = fusePlaces(observations).slice(0, limit)

  return NextResponse.json({
    places,
    meta: {
      providersQueried: providers.map((p) => p.id),
      providerErrors,
      rawObservationCount: observations.length,
      fusedPlaceCount: places.length,
    },
  })
}
