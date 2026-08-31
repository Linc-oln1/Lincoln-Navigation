// lib/geo-intelligence/ghana-landmarks.ts
//
// LOCAL KNOWLEDGE ENGINE — resolves the way Ghanaians actually give
// directions ("opposite the old filling station", "behind the MTN
// office", "3rd house after the blue kiosk", "near the junction")
// into a coordinate estimate, because most addresses in Ghana are
// landmark-relative rather than a house number on a named street —
// this is a real, well-documented gap in postal addressing (Ghana's
// GhanaPostGPS digital-address system exists precisely because of
// it), not a quirk to route around.
//
// HONESTY OVER THEATRE: this module does NOT pretend to compute an
// exact building. It resolves a named anchor via OpenStreetMap,
// then returns a center point plus an explicit uncertainty radius
// that widens with how indirect the description is ("opposite X" is
// tighter than "3rd house after X"). A wrong answer stated with
// false confidence is more dangerous in a navigation product than a
// right-shaped answer stated with honest uncertainty — so the
// uncertainty radius is a first-class, always-returned field, not
// an internal detail.

import type { LatLng } from "./types"

export type LandmarkRelation =
  | "at"
  | "opposite"
  | "near"
  | "behind"
  | "before"
  | "after"

export interface RelativeLandmarkResult {
  raw: string
  relation: LandmarkRelation
  ordinal?: number
  anchorPhrase: string
  anchorName: string
  anchorLocation: LatLng
  estimatedLocation: LatLng
  uncertaintyRadiusMeters: number
  confidence: number
  explanation: string
}

// Common local phrasing mapped to OSM tags. Extend this table as
// real usage surfaces phrases it misses — it's a lookup table, not
// a model, specifically so it stays editable by anyone, not just
// whoever trained it.
const LANDMARK_KEYWORD_TAGS: Array<{ pattern: RegExp; key: string; value?: string }> = [
  { pattern: /filling station|fuel station|gas station|petrol station/i, key: "amenity", value: "fuel" },
  { pattern: /market/i, key: "amenity", value: "marketplace" },
  { pattern: /church/i, key: "amenity", value: "place_of_worship" },
  { pattern: /mosque/i, key: "amenity", value: "place_of_worship" },
  { pattern: /school/i, key: "amenity", value: "school" },
  { pattern: /hospital|clinic/i, key: "amenity", value: "hospital" },
  { pattern: /pharmacy|chemist/i, key: "amenity", value: "pharmacy" },
  { pattern: /bank/i, key: "amenity", value: "bank" },
  { pattern: /bridge/i, key: "man_made", value: "bridge" },
  { pattern: /roundabout|circle/i, key: "junction", value: "roundabout" },
  { pattern: /junction/i, key: "highway", value: "traffic_signals" },
  { pattern: /police/i, key: "amenity", value: "police" },
]

const RELATION_PATTERNS: Array<{ pattern: RegExp; relation: LandmarkRelation }> = [
  { pattern: /\bopposite\b/i, relation: "opposite" },
  { pattern: /\bacross from\b/i, relation: "opposite" },
  { pattern: /\bbehind\b/i, relation: "behind" },
  { pattern: /\bnear\b|\bbeside\b|\bnext to\b|\bby the\b/i, relation: "near" },
  { pattern: /\bafter\b/i, relation: "after" },
  { pattern: /\bbefore\b/i, relation: "before" },
]

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
}

// Base uncertainty per relation type — deliberately conservative.
// These are starting priors, not measured constants; tune them
// against real user-confirmed arrivals once the system has usage
// data, the same way the confidence weights in confidence.ts should
// be tuned, not treated as permanent.
const BASE_UNCERTAINTY_METERS: Record<LandmarkRelation, number> = {
  at: 20,
  opposite: 35,
  near: 80,
  behind: 45,
  before: 60,
  after: 60,
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
]

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

function bearing(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const dLng = toRad(to.lng - from.lng)

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function destinationPoint(from: LatLng, bearingDeg: number, distanceMeters: number): LatLng {
  const R = 6371000
  const brng = toRad(bearingDeg)
  const lat1 = toRad(from.lat)
  const lng1 = toRad(from.lng)
  const dOverR = distanceMeters / R

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dOverR) + Math.cos(lat1) * Math.sin(dOverR) * Math.cos(brng)
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(dOverR) * Math.cos(lat1),
      Math.cos(dOverR) - Math.sin(lat1) * Math.sin(lat2)
    )

  return { lat: toDeg(lat2), lng: toDeg(lng2) }
}

function parseRelation(text: string): { relation: LandmarkRelation; ordinal?: number } {
  for (const { pattern, relation } of RELATION_PATTERNS) {
    if (pattern.test(text)) {
      if (relation === "after" || relation === "before") {
        const ordinalMatch = text.match(
          /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\b/i
        )
        const ordinal = ordinalMatch ? ORDINAL_WORDS[ordinalMatch[1].toLowerCase()] : 1
        return { relation, ordinal }
      }
      return { relation }
    }
  }
  return { relation: "at" }
}

function extractAnchorPhrase(text: string): string {
  return text
    .replace(/\b(opposite|across from|behind|near|beside|next to|by the)\b/gi, "")
    .replace(/\b(after|before)\b/gi, "")
    .replace(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)\b/gi, "")
    .replace(/\b(the|a|an|house|building|shop)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

interface AnchorMatch {
  name: string
  location: LatLng
}

async function findAnchor(
  phrase: string,
  areaHint: LatLng,
  searchRadiusMeters: number
): Promise<AnchorMatch | null> {
  const tagMatch = LANDMARK_KEYWORD_TAGS.find((t) => t.pattern.test(phrase))

  const clauses: string[] = []
  const bbox = `(around:${searchRadiusMeters},${areaHint.lat},${areaHint.lng})`

  if (tagMatch) {
    const tag = tagMatch.value ? `"${tagMatch.key}"="${tagMatch.value}"` : `"${tagMatch.key}"`
    clauses.push(`  node[${tag}]${bbox};\n  way[${tag}]${bbox};\n`)
  }

  // Also try matching the anchor phrase as a literal name (e.g. a
  // brand: "MTN", "Shell", "Vodafone") — covers cases the keyword
  // table above doesn't anticipate.
  const nameWords = phrase.split(" ").filter((w) => w.length > 2)
  if (nameWords.length > 0) {
    const escaped = nameWords[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    clauses.push(`  node["name"~"${escaped}",i]${bbox};\n  way["name"~"${escaped}",i]${bbox};\n`)
  }

  if (clauses.length === 0) return null

  const query = `[out:json][timeout:15];\n(\n${clauses.join("")});\nout center 5;`

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        cache: "no-store",
      })
      if (!response.ok) continue

      const data = await response.json()
      const elements: any[] = Array.isArray(data.elements) ? data.elements : []
      if (elements.length === 0) continue

      // Prefer the closest match to the area hint over the first
      // result — Overpass doesn't sort by distance.
      const withDistance = elements
        .map((el) => {
          const lat = el.lat ?? el.center?.lat
          const lng = el.lon ?? el.center?.lon
          if (typeof lat !== "number" || typeof lng !== "number") return null
          const d = Math.hypot(lat - areaHint.lat, lng - areaHint.lng)
          return { name: el.tags?.name ?? phrase, location: { lat, lng }, d }
        })
        .filter((x): x is { name: string; location: LatLng; d: number } => x !== null)
        .sort((a, b) => a.d - b.d)

      if (withDistance.length > 0) {
        return { name: withDistance[0].name, location: withDistance[0].location }
      }
    } catch {
      continue
    }
  }

  return null
}

/**
 * Resolve a relative-landmark description into an estimated
 * location. `areaHint` should be the town/neighborhood the user
 * already told the system they mean — this module deliberately
 * does not guess *which* town "the old filling station" is in,
 * since guessing that would be exactly the kind of false confidence
 * this design avoids.
 */
export async function resolveRelativeLandmark(
  raw: string,
  areaHint: LatLng,
  searchRadiusMeters = 3000
): Promise<RelativeLandmarkResult | null> {
  const { relation, ordinal } = parseRelation(raw)
  const anchorPhrase = extractAnchorPhrase(raw)

  if (!anchorPhrase) return null

  const anchor = await findAnchor(anchorPhrase, areaHint, searchRadiusMeters)
  if (!anchor) return null

  let estimatedLocation = anchor.location
  let uncertainty = BASE_UNCERTAINTY_METERS[relation]
  let explanation = `Resolved "${raw}" to ${anchor.name}, treating the anchor's own location as the estimate.`

  if (relation === "before" || relation === "after") {
    const n = ordinal ?? 1
    // No reliable road-heading data at this layer, so this nudges
    // along the bearing from the area hint through the anchor,
    // which approximates "further down the same road" without
    // claiming precision it doesn't have — hence the wide, growing
    // uncertainty radius rather than a tight point.
    const brng = bearing(areaHint, anchor.location)
    const extendBearing = relation === "after" ? brng : (brng + 180) % 360
    estimatedLocation = destinationPoint(anchor.location, extendBearing, n * 15)
    uncertainty = BASE_UNCERTAINTY_METERS[relation] + n * 20
    explanation = `Resolved "${raw}" as approximately ${n} building(s) ${relation} ${anchor.name}, extrapolated along the road bearing — treat this as a rough estimate, not a precise pin.`
  } else if (relation === "opposite") {
    explanation = `Resolved "${raw}" to the area directly around ${anchor.name}; the exact side of the road is not resolvable from this data, so the pin sits on the anchor with a wider radius covering both sides.`
  } else if (relation === "behind") {
    explanation = `Resolved "${raw}" to the area behind ${anchor.name}; without building-footprint data the exact rear-facing offset can't be computed, so the radius covers the immediate vicinity instead.`
  }

  // Confidence here is intentionally capped below what a
  // provider-confirmed CanonicalPlace can reach (see fusion.ts) —
  // a single-source, heuristically-inferred point should never
  // outrank a place multiple providers have independently verified.
  const confidence = Math.max(0.15, Math.min(0.6, 60 / uncertainty))

  return {
    raw,
    relation,
    ordinal,
    anchorPhrase,
    anchorName: anchor.name,
    anchorLocation: anchor.location,
    estimatedLocation,
    uncertaintyRadiusMeters: uncertainty,
    confidence,
    explanation,
  }
}
