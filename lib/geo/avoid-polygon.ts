// lib/geo/avoid-polygon.ts
//
// Turns "avoid a circle around this point" into the GeoJSON polygon
// that OpenRouteService's `options.avoid_polygons` wants. Used by the
// "Route around it" action (Phase 3a) to make a routing engine skip
// the roads near a reported hazard.

export interface AvoidCircle {
  lat: number
  lng: number
  /** Defaults to 160 m — a bit wider than a single junction. */
  radiusM?: number
}

const DEFAULT_RADIUS_M = 160
const SIDES = 10

/** Approximate ring (GeoJSON [lng, lat] order, closed) around a point. */
export function circleRing(circle: AvoidCircle): [number, number][] {
  const r = circle.radiusM ?? DEFAULT_RADIUS_M
  const dLat = r / 111_320
  const dLng = r / (111_320 * Math.cos((circle.lat * Math.PI) / 180) || 1)

  const ring: [number, number][] = []
  for (let i = 0; i <= SIDES; i++) {
    const angle = (i / SIDES) * 2 * Math.PI
    ring.push([
      circle.lng + dLng * Math.cos(angle),
      circle.lat + dLat * Math.sin(angle),
    ])
  }
  return ring
}

/** A GeoJSON MultiPolygon covering every circle — ORS avoid_polygons. */
export function avoidPolygons(circles: AvoidCircle[]): {
  type: "MultiPolygon"
  coordinates: [number, number][][][]
} {
  return {
    type: "MultiPolygon",
    coordinates: circles.map((c) => [circleRing(c)]),
  }
}
