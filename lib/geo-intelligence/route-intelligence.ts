// lib/geo-intelligence/route-intelligence.ts
//
// ROUTE INTELLIGENCE — queries every configured routing engine
// (OSRM always; Valhalla and GraphHopper when their env vars are
// set) for candidate routes, then scores each candidate on more
// than raw ETA: turn complexity and known hazard corridors factor
// in too, with every factor and weight exposed in the result so a
// caller (or a curious user) can see exactly why one route beat
// another instead of trusting an opaque "best route" label.
//
// SERVER-ONLY.

import { calculateRoute, type Coordinate } from "../routing"
import { haversineMeters } from "./confidence"
import type { HazardZone, LatLng, RouteCandidate, ScoredRoute, VehicleType } from "./types"

/* =========================================================
   HAZARD SEED DATA

   Illustrative starting points only — approximate coordinates for
   corridors that recur in Ghanaian rainy-season flooding reports
   (Accra's Circle/Odawna/Alajo drainage basin and a few other
   frequently-cited low-lying junctions). These are NOT live sensor
   data or an authoritative hazard feed; treat this array as a seed
   to replace with real crowd-reports (see the "crowd_report" source
   type) or an official Hydrological Services / NADMO feed once one
   is wired in. Shipping this as if it were verified real-time data
   would be worse than not having it at all — a navigation system
   that's confidently wrong about flooding is dangerous.
========================================================= */

export const HAZARD_SEED: HazardZone[] = [
  {
    id: "hz-circle-odawna",
    kind: "flood",
    description: "Kwame Nkrumah Circle / Odawna drain — frequent rainy-season flooding",
    polygonOrLine: [
      { lat: 5.5701, lng: -0.2107 },
      { lat: 5.5715, lng: -0.2095 },
    ],
    severity: 0.7,
    seasonal: true,
    source: "seed_dataset",
  },
  {
    id: "hz-alajo",
    kind: "flood",
    description: "Alajo lowland — known flood-prone stretch",
    polygonOrLine: [
      { lat: 5.5877, lng: -0.2245 },
      { lat: 5.589, lng: -0.223 },
    ],
    severity: 0.6,
    seasonal: true,
    source: "seed_dataset",
  },
  {
    id: "hz-adenta-barrier",
    kind: "flood",
    description: "Adenta Barrier area — reported waterlogging in heavy rain",
    polygonOrLine: [{ lat: 5.7086, lng: -0.1657 }],
    severity: 0.5,
    seasonal: true,
    source: "seed_dataset",
  },
]

const HAZARD_PROXIMITY_METERS = 200

/* =========================================================
   ROUTE ENGINE ABSTRACTION — same pattern as providers.ts:
   every engine returns the same RouteCandidate shape, and is
   skipped (not an error) when unconfigured.
========================================================= */

interface RouteEngine {
  id: string
  isConfigured(): boolean
  getRoutes(origin: LatLng, destination: LatLng, vehicle: VehicleType): Promise<RouteCandidate[]>
}

function vehicleToOsrmMode(vehicle: VehicleType): "driving" | "walking" | "cycling" {
  if (vehicle === "walking") return "walking"
  if (vehicle === "cycling") return "cycling"
  return "driving" // car, motorcycle, bus all use the road network
}

function countTurns(steps: Array<{ maneuver: { type: string } }>): number {
  return steps.filter((s) => !["depart", "arrive", "continue", "new name"].includes(s.maneuver.type))
    .length
}

class OsrmEngine implements RouteEngine {
  id = "osrm"
  isConfigured(): boolean {
    return true // free/keyless public demo server as the floor
  }

  async getRoutes(origin: LatLng, destination: LatLng, vehicle: VehicleType): Promise<RouteCandidate[]> {
    const coords: Coordinate[] = [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ]

    const result = await calculateRoute(coords, {
      mode: vehicleToOsrmMode(vehicle),
      alternatives: true,
      steps: true,
    })

    return result.routes.map((route) => ({
      id: `osrm-${route.id}`,
      engine: "osrm",
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      turnCount: countTurns(route.steps),
      hazardsCrossed: [],
    }))
  }
}

class GraphHopperEngine implements RouteEngine {
  id = "graphhopper"
  isConfigured(): boolean {
    return Boolean(process.env.GRAPHHOPPER_API_KEY)
  }

  async getRoutes(origin: LatLng, destination: LatLng, vehicle: VehicleType): Promise<RouteCandidate[]> {
    const key = process.env.GRAPHHOPPER_API_KEY
    if (!key) return []

    const vehicleParam = vehicle === "cycling" ? "bike" : vehicle === "walking" ? "foot" : "car"

    const params = new URLSearchParams()
    params.append("point", `${origin.lat},${origin.lng}`)
    params.append("point", `${destination.lat},${destination.lng}`)
    params.set("vehicle", vehicleParam)
    params.set("points_encoded", "false")
    params.set("algorithm", "alternative_route")
    params.set("key", key)

    const response = await fetch(`https://graphhopper.com/api/1/route?${params}`, {
      cache: "no-store",
    })

    if (!response.ok) throw new Error(`GraphHopper request failed (${response.status})`)

    const data = await response.json()
    const paths: any[] = Array.isArray(data.paths) ? data.paths : []

    return paths.map((path, i) => ({
      id: `graphhopper-${i}`,
      engine: "graphhopper",
      distanceMeters: path.distance,
      durationSeconds: path.time / 1000,
      geometry: (path.points?.coordinates ?? []).map(([lng, lat]: [number, number]) => ({
        lat,
        lng,
      })),
      turnCount: Array.isArray(path.instructions)
        ? path.instructions.filter((instr: any) => instr.sign !== 0).length
        : 0,
      hazardsCrossed: [],
    }))
  }
}

/** Decodes a Valhalla-style encoded polyline (precision 1e6). */
function decodePolyline6(encoded: string): LatLng[] {
  const points: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0
  const factor = 1e6

  while (index < encoded.length) {
    let result = 0
    let shift = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    result = 0
    shift = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push({ lat: lat / factor, lng: lng / factor })
  }

  return points
}

class ValhallaEngine implements RouteEngine {
  id = "valhalla"
  isConfigured(): boolean {
    return Boolean(process.env.VALHALLA_URL)
  }

  async getRoutes(origin: LatLng, destination: LatLng, vehicle: VehicleType): Promise<RouteCandidate[]> {
    const base = process.env.VALHALLA_URL
    if (!base) return []

    const costing =
      vehicle === "cycling" ? "bicycle" : vehicle === "walking" ? "pedestrian" : "auto"

    const response = await fetch(`${base.replace(/\/+$/, "")}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [
          { lat: origin.lat, lon: origin.lng },
          { lat: destination.lat, lon: destination.lng },
        ],
        costing,
        alternates: 2,
      }),
      cache: "no-store",
    })

    if (!response.ok) throw new Error(`Valhalla request failed (${response.status})`)

    const data = await response.json()
    const trips = [data.trip, ...(data.alternates ?? []).map((a: any) => a.trip)].filter(Boolean)

    return trips.map((trip, i) => {
      const geometry = (trip.legs ?? []).flatMap((leg: any) => decodePolyline6(leg.shape ?? ""))
      const turnCount = (trip.legs ?? []).reduce(
        (sum: number, leg: any) =>
          sum +
          (leg.maneuvers ?? []).filter((m: any) => ![1, 4, 8].includes(m.type)).length,
        0
      )

      return {
        id: `valhalla-${i}`,
        engine: "valhalla",
        distanceMeters: (trip.summary?.length ?? 0) * 1000, // Valhalla reports km
        durationSeconds: trip.summary?.time ?? 0,
        geometry,
        turnCount,
        hazardsCrossed: [],
      }
    })
  }
}

const ENGINES: RouteEngine[] = [new OsrmEngine(), new GraphHopperEngine(), new ValhallaEngine()]

/* =========================================================
   HAZARD DETECTION + SCORING
========================================================= */

function detectHazards(geometry: LatLng[], hazards: HazardZone[]): HazardZone[] {
  if (geometry.length === 0) return []

  return hazards.filter((hazard) =>
    hazard.polygonOrLine.some((hazardPoint) =>
      geometry.some((routePoint) => haversineMeters(routePoint, hazardPoint) <= HAZARD_PROXIMITY_METERS)
    )
  )
}

export function scoreRoutes(
  candidates: RouteCandidate[],
  options: { vehicle: VehicleType; hazards?: HazardZone[] } = { vehicle: "car" }
): ScoredRoute[] {
  if (candidates.length === 0) return []

  const hazards = options.hazards ?? HAZARD_SEED
  const withHazards = candidates.map((c) => ({
    ...c,
    hazardsCrossed: detectHazards(c.geometry, hazards),
  }))

  const fastest = Math.min(...withHazards.map((c) => c.durationSeconds))
  const slowest = Math.max(...withHazards.map((c) => c.durationSeconds))
  const maxTurns = Math.max(1, ...withHazards.map((c) => c.turnCount))

  // Vehicle-specific weighting: a motorcycle can thread through
  // congestion a bus can't, so ETA matters relatively more and turn
  // density relatively less for it; a bus should avoid hazard-prone
  // and turn-heavy routes more aggressively. These are, again,
  // explicit and meant to be tuned against real outcomes.
  const WEIGHT_PROFILES: Record<VehicleType, { eta: number; turns: number; hazard: number }> = {
    car: { eta: 0.45, turns: 0.2, hazard: 0.35 },
    motorcycle: { eta: 0.55, turns: 0.1, hazard: 0.35 },
    bus: { eta: 0.3, turns: 0.3, hazard: 0.4 },
    walking: { eta: 0.6, turns: 0.1, hazard: 0.3 },
    cycling: { eta: 0.5, turns: 0.15, hazard: 0.35 },
  }
  const weights = WEIGHT_PROFILES[options.vehicle]

  return withHazards
    .map((candidate): ScoredRoute => {
      const etaScore =
        slowest === fastest ? 1 : 1 - (candidate.durationSeconds - fastest) / (slowest - fastest)

      const turnComplexityScore = 1 - candidate.turnCount / maxTurns

      const hazardSeverity = candidate.hazardsCrossed.reduce(
        (sum, h) => sum + h.severity,
        0
      )
      const hazardScore = Math.max(0, 1 - hazardSeverity)

      // "Road quality" isn't independently observable from free
      // data at this layer, so it's approximated as a function of
      // turn density (proxy for minor/unpaved-road-heavy routing)
      // until a real road-surface dataset is wired in — flagged
      // explicitly rather than silently faked as a real signal.
      const roadQualityScore = turnComplexityScore

      const overall =
        etaScore * weights.eta + hazardScore * weights.hazard + turnComplexityScore * weights.turns

      const reasoning: string[] = [
        `ETA ${Math.round(candidate.durationSeconds / 60)} min via ${candidate.engine} (${Math.round(etaScore * 100)}% of best-in-batch).`,
      ]
      if (candidate.hazardsCrossed.length > 0) {
        reasoning.push(
          `Crosses ${candidate.hazardsCrossed.length} known hazard zone(s): ${candidate.hazardsCrossed
            .map((h) => h.description)
            .join("; ")}.`
        )
      }
      reasoning.push(`${candidate.turnCount} turns (complexity score ${turnComplexityScore.toFixed(2)}).`)

      return {
        ...candidate,
        score: overall,
        scoreBreakdown: { etaScore, roadQualityScore, hazardScore, turnComplexityScore },
        reasoning,
      }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Query every configured engine in parallel and return scored,
 * ranked routes. An engine failing (timeout, bad key, network) is
 * logged and dropped rather than failing the whole request — the
 * point of querying multiple engines is exactly this resilience.
 */
export async function planRoutes(
  origin: LatLng,
  destination: LatLng,
  vehicle: VehicleType = "car"
): Promise<ScoredRoute[]> {
  const engines = ENGINES.filter((e) => e.isConfigured())

  const results = await Promise.allSettled(
    engines.map((engine) => engine.getRoutes(origin, destination, vehicle))
  )

  const candidates: RouteCandidate[] = []
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      candidates.push(...result.value)
    } else {
      console.error(`[route-intelligence] ${engines[i].id} failed:`, result.reason)
    }
  })

  return scoreRoutes(candidates, { vehicle })
}
