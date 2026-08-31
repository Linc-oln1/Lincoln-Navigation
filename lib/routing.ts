// lib/routing.ts
//
// Free, keyless routing client.
//
// PREVIOUSLY: this file required MAPBOX_ACCESS_TOKEN and called the paid
// Mapbox Directions API. That variable was never set anywhere in the
// project (.env.local only defines VALHALLA_URL / GEOCODER_URL, which
// nothing ever read), so every call to calculateRoute() threw immediately
// and the app's "Get Directions" feature never worked.
//
// NOW: this calls the public OSRM routing API (https://project-osrm.org),
// which needs no API key. OSRM's response schema is what Mapbox's
// Directions API itself was built on top of, so the maneuver / step /
// route parsing logic below is unchanged in shape.
//
// Point NEXT_PUBLIC_OSRM_URL at a self-hosted OSRM (or OSRM-compatible)
// server if you have one; otherwise it falls back to the public demo
// server, which is fine for light/personal use.

export type TravelMode =
  | "driving"
  | "driving-traffic"
  | "walking"
  | "cycling"

export type Coordinate = [number, number]
// Coordinate format is [longitude, latitude]

export interface RoutingOptions {
  mode?: TravelMode
  alternatives?: boolean
  steps?: boolean
  overview?: "full" | "simplified" | "false"
}

export interface RouteStep {
  distance: number
  duration: number
  name: string
  instruction: string
  maneuver: {
    type: string
    modifier?: string
    location: Coordinate
    bearingBefore?: number
    bearingAfter?: number
    exit?: number
  }
  geometry?: {
    type: "LineString"
    coordinates: Coordinate[]
  }
  voiceInstruction?: string
}

export interface Route {
  id: string

  distance: number
  duration: number

  geometry: {
    type: "LineString"
    coordinates: Coordinate[]
  }

  steps: RouteStep[]

  summary: string

  // Real-time traffic isn't available from a free/keyless routing
  // backend, so this is always reported as unavailable. Kept as a
  // field (rather than removed) so the UI can render consistently.
  traffic?: {
    hasTraffic: boolean
    congestion?: string[]
  }
}

export interface RoutingResult {
  routes: Route[]
  waypoints: Array<{
    name: string
    location: Coordinate
  }>
  code: string
  message?: string
}

/**
 * Base URL of the OSRM (or OSRM-compatible) routing server.
 *
 * Falls back to the public OSRM demo server, which supports the
 * "driving", "walking" and "cycling" profiles used by this app.
 */
function getRoutingBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_OSRM_URL

  if (configured && configured.trim()) {
    return configured.trim().replace(/\/+$/, "")
  }

  return "https://router.project-osrm.org"
}

/**
 * Convert our travel mode into an OSRM routing profile.
 *
 * OSRM has no dedicated "traffic-aware" profile (that was a
 * Mapbox-only extension), so driving-traffic falls back to driving.
 */
function normalizeMode(mode: TravelMode): string {
  switch (mode) {
    case "driving":
    case "driving-traffic":
      return "driving"

    case "walking":
      return "walking"

    case "cycling":
      return "cycling"

    default:
      return "driving"
  }
}

/**
 * Build the OSRM route request URL.
 */
function buildDirectionsUrl(
  coordinates: Coordinate[],
  options: RoutingOptions
): string {
  if (coordinates.length < 2) {
    throw new Error(
      "At least two coordinates are required to calculate a route."
    )
  }

  const base = getRoutingBaseUrl()

  const profile = normalizeMode(
    options.mode ?? "driving"
  )

  const coordinateString = coordinates
    .map(([lng, lat]) => `${lng},${lat}`)
    .join(";")

  const params = new URLSearchParams()

  params.set(
    "alternatives",
    String(options.alternatives ?? true)
  )

  params.set(
    "steps",
    String(options.steps ?? true)
  )

  params.set(
    "overview",
    options.overview ?? "full"
  )

  params.set("geometries", "geojson")

  return (
    `${base}/route/v1/${profile}/${coordinateString}?${params.toString()}`
  )
}

/**
 * Safely convert a value to a number.
 */
function numberOrUndefined(
  value: unknown
): number | undefined {
  return typeof value === "number"
    ? value
    : undefined
}

/**
 * Extract a human-readable maneuver instruction.
 *
 * OSRM (and therefore Mapbox, which is built on top of it) reports
 * maneuvers as a {type, modifier} pair rather than free text, so we
 * build the sentence ourselves.
 */
function buildInstruction(
  maneuver: {
    type?: string
    modifier?: string
    location?: Coordinate
    exit?: number
  },
  roadName?: string
): string {
  const type = maneuver.type ?? ""
  const modifier = maneuver.modifier ?? ""
  const road = roadName?.trim()

  if (type === "depart") {
    return road
      ? `Start on ${road}`
      : "Start your journey"
  }

  if (type === "arrive") {
    return "You have arrived at your destination"
  }

  if (type === "turn") {
    if (modifier === "left") {
      return road
        ? `Turn left onto ${road}`
        : "Turn left"
    }

    if (modifier === "right") {
      return road
        ? `Turn right onto ${road}`
        : "Turn right"
    }

    if (modifier === "slight left") {
      return road
        ? `Bear slightly left onto ${road}`
        : "Bear slightly left"
    }

    if (modifier === "slight right") {
      return road
        ? `Bear slightly right onto ${road}`
        : "Bear slightly right"
    }

    if (modifier === "sharp left") {
      return road
        ? `Turn sharply left onto ${road}`
        : "Turn sharply left"
    }

    if (modifier === "sharp right") {
      return road
        ? `Turn sharply right onto ${road}`
        : "Turn sharply right"
    }

    return road
      ? `Turn onto ${road}`
      : "Turn"
  }

  if (type === "continue") {
    return road
      ? `Continue on ${road}`
      : "Continue straight"
  }

  if (type === "merge") {
    return road
      ? `Merge onto ${road}`
      : "Merge"
  }

  if (type === "fork") {
    if (modifier === "left") {
      return road
        ? `Keep left onto ${road}`
        : "Keep left"
    }

    if (modifier === "right") {
      return road
        ? `Keep right onto ${road}`
        : "Keep right"
    }

    return road
      ? `Take the fork onto ${road}`
      : "Take the fork"
  }

  if (type === "roundabout" || type === "roundabout turn") {
    if (maneuver.exit) {
      return road
        ? `Take exit ${maneuver.exit} onto ${road}`
        : `Take exit ${maneuver.exit}`
    }

    return road
      ? `Enter the roundabout and continue onto ${road}`
      : "Enter the roundabout"
  }

  if (type === "rotary") {
    if (maneuver.exit) {
      return road
        ? `Take exit ${maneuver.exit} onto ${road}`
        : `Take exit ${maneuver.exit}`
    }

    return "Enter the rotary"
  }

  if (type === "new name") {
    return road
      ? `Continue onto ${road}`
      : "Continue"
  }

  if (type === "on ramp") {
    return road
      ? `Take the ramp onto ${road}`
      : "Take the ramp"
  }

  if (type === "off ramp") {
    return road
      ? `Take the exit onto ${road}`
      : "Take the exit"
  }

  if (type === "end of road") {
    if (modifier === "left") {
      return road
        ? `Turn left onto ${road}`
        : "Turn left at the end of the road"
    }

    if (modifier === "right") {
      return road
        ? `Turn right onto ${road}`
        : "Turn right at the end of the road"
    }

    return road
      ? `Continue onto ${road}`
      : "Continue at the end of the road"
  }

  if (type === "uturn") {
    return "Make a U-turn"
  }

  return road
    ? `Continue onto ${road}`
    : "Continue"
}

/**
 * Format seconds into a human-readable ETA.
 */
export function formatDuration(
  seconds: number
): string {
  if (!Number.isFinite(seconds)) {
    return "—"
  }

  const totalMinutes = Math.max(
    0,
    Math.round(seconds / 60)
  )

  if (totalMinutes < 1) {
    return "Less than 1 min"
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  if (minutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${minutes} min`
}

/**
 * Format meters into km/m or mi/ft.
 */
export function formatDistance(
  meters: number,
  units: "metric" | "imperial" = "metric"
): string {
  if (!Number.isFinite(meters)) {
    return "—"
  }

  if (units === "imperial") {
    const miles = meters / 1609.344

    if (miles < 0.1) {
      const feet = meters * 3.28084
      return `${Math.round(feet)} ft`
    }

    return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`
  }

  const kilometers = meters / 1000

  if (kilometers < 1) {
    return `${Math.round(meters)} m`
  }

  return `${kilometers.toFixed(kilometers < 10 ? 1 : 0)} km`
}

/**
 * Calculate a route between two or more points.
 *
 * Coordinates MUST be [longitude, latitude], e.g.:
 *
 * Accra: [-0.1870, 5.6037]
 * Kumasi: [-1.6244, 6.6885]
 */
export async function calculateRoute(
  coordinates: Coordinate[],
  options: RoutingOptions = {}
): Promise<RoutingResult> {
  const url = buildDirectionsUrl(
    coordinates,
    options
  )

  const response = await fetch(url, {
    method: "GET",

    headers: {
      Accept: "application/json",
    },

    cache: "no-store",
  })

  if (!response.ok) {
    let message = `Routing request failed (${response.status})`

    try {
      const errorData = await response.json()

      if (
        errorData &&
        typeof errorData.message === "string"
      ) {
        message = errorData.message
      }
    } catch {
      // Ignore JSON parsing errors.
    }

    throw new Error(message)
  }

  const data = await response.json()

  if (data.code !== "Ok") {
    throw new Error(
      data.message ||
        `Routing failed with code: ${data.code}`
    )
  }

  const routes: Route[] = (
    data.routes ?? []
  ).map(
    (
      route: any,
      routeIndex: number
    ): Route => {
      const steps: RouteStep[] = []

      for (
        const leg of route.legs ?? []
      ) {
        for (
          const step of leg.steps ?? []
        ) {
          const maneuver = step.maneuver ?? {}

          const instruction =
            buildInstruction(
              maneuver,
              step.name
            )

          steps.push({
            distance:
              numberOrUndefined(
                step.distance
              ) ?? 0,

            duration:
              numberOrUndefined(
                step.duration
              ) ?? 0,

            name:
              typeof step.name === "string"
                ? step.name
                : "",

            instruction,

            maneuver: {
              type:
                typeof maneuver.type ===
                "string"
                  ? maneuver.type
                  : "continue",

              modifier:
                typeof maneuver.modifier ===
                "string"
                  ? maneuver.modifier
                  : undefined,

              location:
                Array.isArray(
                  maneuver.location
                )
                  ? maneuver.location
                  : [0, 0],

              bearingBefore:
                numberOrUndefined(
                  maneuver.bearing_before
                ),

              bearingAfter:
                numberOrUndefined(
                  maneuver.bearing_after
                ),

              exit:
                numberOrUndefined(
                  maneuver.exit
                ),
            },

            geometry:
              step.geometry?.type ===
                "LineString"
                ? {
                    type: "LineString",
                    coordinates:
                      step.geometry.coordinates,
                  }
                : undefined,

            voiceInstruction: instruction,
          })
        }
      }

      return {
        id: `route-${routeIndex}`,

        distance:
          numberOrUndefined(
            route.distance
          ) ?? 0,

        duration:
          numberOrUndefined(
            route.duration
          ) ?? 0,

        geometry: {
          type: "LineString",
          coordinates:
            route.geometry?.coordinates ??
            [],
        },

        steps,

        summary:
          typeof route.legs?.[0]
            ?.summary === "string"
            ? route.legs[0].summary
            : "",

        traffic: {
          hasTraffic: false,
        },
      }
    }
  )

  return {
    routes,

    waypoints: (
      data.waypoints ?? []
    ).map((waypoint: any) => ({
      name:
        typeof waypoint.name ===
        "string"
          ? waypoint.name
          : "",

      location:
        Array.isArray(
          waypoint.location
        )
          ? waypoint.location
          : [0, 0],
    })),

    code:
      typeof data.code === "string"
        ? data.code
        : "Ok",

    message:
      typeof data.message === "string"
        ? data.message
        : undefined,
  }
}

/**
 * Convenience function for driving.
 */
export async function getDrivingRoute(
  origin: Coordinate,
  destination: Coordinate,
  options: Omit<
    RoutingOptions,
    "mode"
  > = {}
): Promise<RoutingResult> {
  return calculateRoute(
    [origin, destination],
    {
      ...options,
      mode: "driving",
    }
  )
}

/**
 * Walking route.
 */
export async function getWalkingRoute(
  origin: Coordinate,
  destination: Coordinate,
  options: Omit<
    RoutingOptions,
    "mode"
  > = {}
): Promise<RoutingResult> {
  return calculateRoute(
    [origin, destination],
    {
      ...options,
      mode: "walking",
    }
  )
}

/**
 * Cycling route.
 */
export async function getCyclingRoute(
  origin: Coordinate,
  destination: Coordinate,
  options: Omit<
    RoutingOptions,
    "mode"
  > = {}
): Promise<RoutingResult> {
  return calculateRoute(
    [origin, destination],
    {
      ...options,
      mode: "cycling",
    }
  )
}

/**
 * Get the fastest route from the response.
 */
export function getBestRoute(
  result: RoutingResult
): Route | null {
  if (!result.routes.length) {
    return null
  }

  return [...result.routes].sort(
    (a, b) => a.duration - b.duration
  )[0]
}
