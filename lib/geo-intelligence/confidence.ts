// lib/geo-intelligence/confidence.ts
//
// Shared confidence math. Every function here is a plain,
// inspectable formula — no ML model, no hidden state. That's
// deliberate: a navigation system that tells someone "turn here" or
// "this pharmacy is open" needs to be able to show its work when
// it's wrong, and a formula you can read beats a model you can't.

import type { LatLng } from "./types"

const EARTH_RADIUS_METERS = 6371000

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

/**
 * How many independent providers observed this record, normalized
 * to 0-1. Four is treated as "full agreement" since that's the
 * maximum this system currently queries (Google, Foursquare,
 * Mapbox, OSM) — tune MAX_PROVIDERS if more are added later.
 */
const MAX_PROVIDERS = 4

export function sourceAgreementScore(providerCount: number): number {
  return Math.min(1, providerCount / MAX_PROVIDERS)
}

/**
 * Freshness decays smoothly rather than falling off a cliff — a
 * place observed 40 days ago is only slightly less trustworthy than
 * one observed yesterday, but a review from 3 years ago (a real
 * failure mode: closed businesses that never got flagged) should
 * pull confidence down hard. Half-life of 90 days.
 */
export function freshnessScore(observedAt: string, now: Date = new Date()): number {
  const ageMs = now.getTime() - new Date(observedAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const halfLifeDays = 90
  return Math.pow(0.5, Math.max(0, ageDays) / halfLifeDays)
}

/**
 * How tightly do the providers' coordinates for "the same place"
 * cluster? Tight clustering (a few meters, typical GPS/building
 * footprint noise) scores near 1; providers disagreeing by hundreds
 * of meters (a real, common failure mode — one provider geocoded
 * to a P.O. box, another to a delivery entrance three streets over)
 * scores low even if every provider individually seems confident.
 */
export function spatialConsistencyScore(locations: LatLng[]): number {
  if (locations.length <= 1) return 0.5 // single source: neither confirmed nor contradicted

  const centroid: LatLng = {
    lat: locations.reduce((sum, l) => sum + l.lat, 0) / locations.length,
    lng: locations.reduce((sum, l) => sum + l.lng, 0) / locations.length,
  }

  const meanDistance =
    locations.reduce((sum, l) => sum + haversineMeters(l, centroid), 0) / locations.length

  // 15m spread -> ~0.9, 100m -> ~0.4, 300m+ -> near 0.
  return Math.exp(-meanDistance / 120)
}

export function compositeConfidence(input: {
  sourceAgreement: number
  freshness: number
  spatialConsistency: number
}): number {
  // Weights are explicit and tunable — see the module-level note in
  // types.ts. Spatial consistency is weighted heaviest because a
  // wrong location is the single most damaging error a navigation
  // system can make (it doesn't just annoy the user, it can send
  // them somewhere unsafe or waste real time and fuel).
  const WEIGHTS = { sourceAgreement: 0.3, freshness: 0.25, spatialConsistency: 0.45 }

  return (
    input.sourceAgreement * WEIGHTS.sourceAgreement +
    input.freshness * WEIGHTS.freshness +
    input.spatialConsistency * WEIGHTS.spatialConsistency
  )
}
