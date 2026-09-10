// lib/hazard-geometry.ts
//
// Client-safe geometry helpers for deciding which hazards sit on a
// route. Used by the directions panel (Phase 2a) to warn about
// flooding / closures / checkpoints a calculated route passes near.
//
// Route coordinates here are [lat, lng] — the convention
// onRouteCalculated() and the map use — NOT the [lng, lat] that
// lib/routing.ts / OSRM speak internally.

import { haversineMeters } from "./geo-intelligence/confidence"
import type { LatLng } from "./geo-intelligence/types"
import type { BBox, Hazard } from "./hazards"

export type RoutePoint = [number, number] // [lat, lng]

export interface OnRouteHazard {
  hazard: Hazard
  /** Metres from the route start to the closest point on the route. */
  metresAlongRoute: number
  /** Closest approach of the hazard to the route, in metres. */
  minDistanceM: number
}

const DEFAULT_THRESHOLD_M = 200

/**
 * Padded bounding box around a route, for a single /api/hazards
 * fetch. `padDeg` ≈ 0.02° ≈ 2 km at Ghana's latitude.
 */
export function routeBBox(coords: RoutePoint[], padDeg = 0.02): BBox {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const [lat, lng] of coords) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }

  return {
    minLat: minLat - padDeg,
    maxLat: maxLat + padDeg,
    minLng: minLng - padDeg,
    maxLng: maxLng + padDeg,
  }
}

/**
 * Closest point on segment A→B to point P, all in lat/lng degrees.
 * Uses an equirectangular projection (cos-latitude scaled) which is
 * accurate at the ~metre scale over the short segments a routing
 * polyline is made of. Returns the projected point plus how far
 * along the segment it fell (0–1).
 */
function closestOnSegment(
  p: RoutePoint,
  a: RoutePoint,
  b: RoutePoint
): { point: RoutePoint; t: number } {
  const latRef = ((a[0] + b[0]) / 2) * (Math.PI / 180)
  const kx = Math.cos(latRef) // lng degrees shrink toward the poles

  const ax = a[1] * kx
  const ay = a[0]
  const bx = b[1] * kx
  const by = b[0]
  const px = p[1] * kx
  const py = p[0]

  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy

  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  return {
    point: [ay + t * dy, (ax + t * dx) / kx],
    t,
  }
}

/**
 * Closest approach of `point` to a polyline: the metre distance and
 * how far along the line (from the start) that closest point falls.
 * Pass `cumulative` (segment-length prefix sums) to avoid recomputing
 * it per call when scanning many points against the same line.
 */
export function nearestOnPolyline(
  point: RoutePoint,
  coords: RoutePoint[],
  cumulative?: number[]
): { distanceM: number; metresAlong: number } {
  if (coords.length === 0) return { distanceM: Infinity, metresAlong: 0 }
  if (coords.length === 1) {
    return {
      distanceM: haversineMeters(
        { lat: point[0], lng: point[1] },
        { lat: coords[0][0], lng: coords[0][1] }
      ),
      metresAlong: 0,
    }
  }

  const cum = cumulative ?? buildCumulative(coords)
  let best = Infinity
  let bestAlong = 0

  for (let i = 1; i < coords.length; i++) {
    const { point: proj, t } = closestOnSegment(point, coords[i - 1], coords[i])
    const d = haversineMeters(
      { lat: point[0], lng: point[1] },
      { lat: proj[0], lng: proj[1] }
    )
    if (d < best) {
      best = d
      bestAlong = cum[i - 1] + t * (cum[i] - cum[i - 1])
    }
  }

  return { distanceM: best, metresAlong: bestAlong }
}

function buildCumulative(coords: RoutePoint[]): number[] {
  const cum: number[] = [0]
  for (let i = 1; i < coords.length; i++) {
    cum[i] =
      cum[i - 1] +
      haversineMeters(
        { lat: coords[i - 1][0], lng: coords[i - 1][1] },
        { lat: coords[i][0], lng: coords[i][1] }
      )
  }
  return cum
}

/**
 * Metre distance from a point to a polyline — segment-aware, so a
 * point between two far-apart vertices is still measured correctly.
 * `LatLng` in/out to suit the geo-intelligence layer.
 */
export function pointToPolylineMeters(
  point: LatLng,
  polyline: LatLng[]
): number {
  return nearestOnPolyline(
    [point.lat, point.lng],
    polyline.map((p) => [p.lat, p.lng] as RoutePoint)
  ).distanceM
}

/**
 * Which hazards lie within `thresholdM` of the route, each with how
 * far along the route the closest approach is, sorted start → end.
 * Seed/official zones are treated exactly like point hazards.
 */
export function hazardsOnRoute(
  coords: RoutePoint[],
  hazards: Hazard[],
  opts: { thresholdM?: number } = {}
): OnRouteHazard[] {
  const threshold = opts.thresholdM ?? DEFAULT_THRESHOLD_M
  if (coords.length < 2 || hazards.length === 0) return []

  const cumulative = buildCumulative(coords)
  const out: OnRouteHazard[] = []

  for (const hazard of hazards) {
    const { distanceM, metresAlong } = nearestOnPolyline(
      [hazard.location.lat, hazard.location.lng],
      coords,
      cumulative
    )
    if (distanceM <= threshold) {
      out.push({
        hazard,
        metresAlongRoute: metresAlong,
        minDistanceM: distanceM,
      })
    }
  }

  return out.sort((a, b) => a.metresAlongRoute - b.metresAlongRoute)
}

/**
 * How far along the route the closest point to `point` is, in
 * metres from the start. Used during live navigation to tell
 * whether a hazard is still ahead of the driver.
 */
export function distanceAlongRoute(
  coords: RoutePoint[],
  point: RoutePoint
): number {
  if (coords.length < 2) return 0
  return nearestOnPolyline(point, coords).metresAlong
}

/** "1.2 km in" / "450 m in" for a distance along the route. */
export function alongRouteLabel(metres: number): string {
  if (metres < 950) return `${Math.round(metres / 10) * 10} m in`
  return `${(metres / 1000).toFixed(1)} km in`
}
