// lib/geo-intelligence/types.ts
//
// Shared vocabulary for the geo-intelligence layer: multi-provider
// place data (Google Places / Foursquare / Mapbox / OpenStreetMap)
// reconciled into one canonical record per real-world place, plus
// the route-scoring types used by route-intelligence.ts.
//
// Design note, stated plainly rather than marketed: nothing here is
// "free of bias." Every score below is a weighted formula, and the
// weights are a value judgment someone made on purpose. What this
// layer buys you isn't the absence of a point of view — it's that
// the point of view is written down as a number you can read, log,
// and change, instead of living silently in one engineer's head or
// one provider's black-box ranking. That is the entire design
// philosophy of this module: make judgment legible, not eliminate it.

export type ProviderId = "google" | "foursquare" | "mapbox" | "osm"

export interface LatLng {
  lat: number
  lng: number
}

export interface PlaceObservation {
  provider: ProviderId
  providerId: string
  observedAt: string // ISO timestamp
  name: string
  location: LatLng
  category?: string
  address?: string
  rating?: number // 0-5, provider-native scale is normalized to this
  ratingCount?: number
  photos?: string[]
  hours?: OpeningHours
  phone?: string
  website?: string
  priceLevel?: number // 0-4
  raw?: unknown // original provider payload, kept for debugging/audit
}

export interface OpeningHours {
  // 0 = Sunday .. 6 = Saturday, matching JS Date#getDay()
  periods: Array<{
    day: number
    open: string // "HH:MM"
    close: string // "HH:MM"
  }>
  openNow?: boolean
}

export interface ConfidenceBreakdown {
  sourceAgreement: number // 0-1: do providers agree on identity/location?
  freshness: number // 0-1: how recently was this observed?
  spatialConsistency: number // 0-1: how tightly do provider coords cluster?
  providerCount: number
  overall: number // 0-1 weighted composite of the above
}

export interface CanonicalPlace {
  id: string // stable hash of name+location, not tied to any one provider
  name: string
  location: LatLng
  category: string
  address?: string
  rating?: number
  ratingCount?: number
  photos: string[]
  hours?: OpeningHours
  phone?: string
  website?: string
  priceLevel?: number
  providers: ProviderId[]
  observations: PlaceObservation[]
  confidence: ConfidenceBreakdown
  localNames?: string[] // Akan/Ewe/Ga/Dagbani or informal names, if known
}

/* =========================================================
   ROUTE INTELLIGENCE TYPES
========================================================= */

export type VehicleType = "car" | "motorcycle" | "bus" | "walking" | "cycling"

export interface HazardZone {
  id: string
  kind: "flood" | "poor_surface" | "accident_prone" | "checkpoint" | "closure"
  description: string
  polygonOrLine: LatLng[]
  severity: number // 0-1
  seasonal?: boolean
  source: "seed_dataset" | "crowd_report" | "official"
  reportedAt?: string
}

export interface RouteCandidate {
  id: string
  engine: string // "osrm" | "valhalla" | "graphhopper" | ...
  distanceMeters: number
  durationSeconds: number
  geometry: LatLng[]
  turnCount: number
  hazardsCrossed: HazardZone[]
}

export interface ScoredRoute extends RouteCandidate {
  score: number // 0-1, higher is better
  scoreBreakdown: {
    etaScore: number
    roadQualityScore: number
    hazardScore: number
    turnComplexityScore: number
  }
  reasoning: string[] // human-readable trace of why it scored as it did
}
