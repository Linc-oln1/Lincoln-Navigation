// lib/geo-intelligence/fusion.ts
//
// EVIDENCE FUSION — merges raw PlaceObservation records from
// multiple providers into canonical Place records, deduplicating by
// name-similarity + spatial proximity rather than trusting any one
// provider's identifier (providers never share a common ID, so this
// is the only option). This is deliberately simple and auditable:
// a union-find clustering pass, then a per-cluster field-merge pass
// that prefers the freshest / most agreed-upon value for each
// field rather than always trusting one "primary" provider.

import {
  compositeConfidence,
  freshnessScore,
  haversineMeters,
  sourceAgreementScore,
  spatialConsistencyScore,
} from "./confidence"
import type { CanonicalPlace, PlaceObservation } from "./types"

const CLUSTER_DISTANCE_METERS = 60
const NAME_SIMILARITY_THRESHOLD = 0.55

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Cheap, dependency-free string similarity (bigram Dice coefficient).
 * Good enough to tell "KFC - Osu Oxford St" apart from "KFC - Spintex"
 * while still matching "Papaye Fast Food" to "Papaye".
 */
function nameSimilarity(a: string, b: string): number {
  const bigrams = (s: string): Set<string> => {
    const norm = normalizeName(s)
    const set = new Set<string>()
    for (let i = 0; i < norm.length - 1; i++) set.add(norm.slice(i, i + 2))
    return set
  }

  const setA = bigrams(a)
  const setB = bigrams(b)
  if (setA.size === 0 || setB.size === 0) return normalizeName(a) === normalizeName(b) ? 1 : 0

  let intersection = 0
  for (const gram of setA) if (setB.has(gram)) intersection++

  return (2 * intersection) / (setA.size + setB.size)
}

function sameEntity(a: PlaceObservation, b: PlaceObservation): boolean {
  const distance = haversineMeters(a.location, b.location)
  if (distance > CLUSTER_DISTANCE_METERS) return false

  return nameSimilarity(a.name, b.name) >= NAME_SIMILARITY_THRESHOLD
}

/** Union-find over observations, clustering "the same real place." */
function clusterObservations(observations: PlaceObservation[]): PlaceObservation[][] {
  const parent = observations.map((_, i) => i)

  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }

  function union(i: number, j: number) {
    const ri = find(i)
    const rj = find(j)
    if (ri !== rj) parent[ri] = rj
  }

  for (let i = 0; i < observations.length; i++) {
    for (let j = i + 1; j < observations.length; j++) {
      if (sameEntity(observations[i], observations[j])) union(i, j)
    }
  }

  const groups = new Map<number, PlaceObservation[]>()
  observations.forEach((obs, i) => {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(obs)
  })

  return [...groups.values()]
}

function hashId(name: string, location: { lat: number; lng: number }): string {
  const input = `${normalizeName(name)}:${location.lat.toFixed(5)}:${location.lng.toFixed(5)}`
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return `place_${Math.abs(hash).toString(36)}`
}

/**
 * Picks the "best" value for a field across a cluster's
 * observations: prefer the freshest observation that actually has
 * the field set, so a provider with stale-but-present data doesn't
 * silently override a provider with fresh-but-missing data in the
 * wrong direction, and vice versa.
 */
function freshestValue<T>(
  observations: PlaceObservation[],
  pick: (obs: PlaceObservation) => T | undefined
): T | undefined {
  const withValue = observations
    .filter((o) => pick(o) !== undefined)
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())

  return withValue.length > 0 ? pick(withValue[0]) : undefined
}

function mergeCluster(observations: PlaceObservation[]): CanonicalPlace {
  const name = freshestValue(observations, (o) => o.name) ?? "Unnamed place"
  const location = freshestValue(observations, (o) => o.location)!

  const providers = [...new Set(observations.map((o) => o.provider))]
  const ratings = observations.filter((o) => typeof o.rating === "number")

  // Rating is averaged (weighted by each provider's review count when
  // available) rather than taken from a single "preferred" provider —
  // one provider's 3.2 from 4,000 reviews should outweigh another's
  // 5.0 from 2 reviews, not get overridden by it.
  let rating: number | undefined
  let ratingCount: number | undefined
  if (ratings.length > 0) {
    const totalWeight = ratings.reduce((sum, o) => sum + (o.ratingCount ?? 1), 0)
    rating =
      ratings.reduce((sum, o) => sum + o.rating! * (o.ratingCount ?? 1), 0) / totalWeight
    ratingCount = ratings.reduce((sum, o) => sum + (o.ratingCount ?? 0), 0)
  }

  const mostRecentObservedAt = observations
    .map((o) => o.observedAt)
    .sort()
    .reverse()[0]

  const locations = observations.map((o) => o.location)
  const agreement = sourceAgreementScore(providers.length)
  const freshness = freshnessScore(mostRecentObservedAt)
  const spatial = spatialConsistencyScore(locations)
  const overall = compositeConfidence({
    sourceAgreement: agreement,
    freshness,
    spatialConsistency: spatial,
  })

  return {
    id: hashId(name, location),
    name,
    location,
    category: freshestValue(observations, (o) => o.category) ?? "unknown",
    address: freshestValue(observations, (o) => o.address),
    rating,
    ratingCount,
    photos: observations.flatMap((o) => o.photos ?? []).slice(0, 10),
    hours: freshestValue(observations, (o) => o.hours),
    phone: freshestValue(observations, (o) => o.phone),
    website: freshestValue(observations, (o) => o.website),
    priceLevel: freshestValue(observations, (o) => o.priceLevel),
    providers,
    observations,
    confidence: {
      sourceAgreement: agreement,
      freshness,
      spatialConsistency: spatial,
      providerCount: providers.length,
      overall,
    },
  }
}

/**
 * Fuse raw observations from every provider into ranked canonical
 * places. Sorted by confidence first (not rating, not distance) —
 * a 4.8-star place that only one shaky source has ever seen belongs
 * below a 4.1-star place three sources independently confirm, when
 * the question is "can I trust this is real and where it says it
 * is." Callers that want distance- or rating-sorted results should
 * re-sort the returned array; confidence ordering is the safe
 * default for an unfamiliar destination.
 */
export function fusePlaces(observations: PlaceObservation[]): CanonicalPlace[] {
  const clusters = clusterObservations(observations)
  return clusters.map(mergeCluster).sort((a, b) => b.confidence.overall - a.confidence.overall)
}
