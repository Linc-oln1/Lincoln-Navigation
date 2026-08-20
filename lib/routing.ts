// lib/routing.ts

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
  voiceInstructions?: boolean
  language?: string
  units?: "metric" | "imperial"
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

  // Traffic-aware duration when available
  durationTypical?: number

  geometry: {
    type: "LineString"
    coordinates: Coordinate[]
  }

  steps: RouteStep[]

  summary: string

  // Traffic information
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
 * Mapbox access token.
 *
 * IMPORTANT:
 * This file should be used from the server side.
 *
 * Put your token in:
 *
 * .env.local
 *
 * MAPBOX_ACCESS_TOKEN=your_token_here
 */
function getMapboxToken(): string {
  const token = process.env.MAPBOX_ACCESS_TOKEN

  if (!token) {
    throw new Error(
      "MAPBOX_ACCESS_TOKEN is missing. Add MAPBOX_ACCESS_TOKEN to .env.local."
    )
  }

  return token
}

/**
 * Convert our travel mode into a Mapbox Directions profile.
 */
function normalizeMode(mode: TravelMode): string {
  switch (mode) {
    case "driving":
      return "driving"

    case "driving-traffic":
      return "driving-traffic"

    case "walking":
      return "walking"

    case "cycling":
      return "cycling"

    default:
      return "driving-traffic"
  }
}

/**
 * Build the Mapbox Directions URL.
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

  const token = getMapboxToken()

  const mode = normalizeMode(
    options.mode ?? "driving-traffic"
  )

  const coordinateString = coordinates
    .map(([lng, lat]) => `${lng},${lat}`)
    .join(";")

  const params = new URLSearchParams()

  params.set("access_token", token)

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

  params.set(
    "geometries",
    "geojson"
  )

  params.set(
    "language",
    options.language ?? "en"
  )

  params.set(
    "voice_instructions",
    String(options.voiceInstructions ?? true)
  )

  params.set(
    "voice_units",
    options.units ?? "metric"
  )

  /*
   * Traffic information is particularly useful for
   * driving-traffic.
   */
  if (mode === "driving-traffic") {
    params.set(
      "annotations",
      "duration,distance,speed,congestion"
    )
  }

  return (
    `https://api.mapbox.com/directions/v5/mapbox/` +
    `${mode}/${coordinateString}?${params.toString()}`
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

  if (type === "roundabout") {
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
 * Format meters into km or miles.
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
 * Coordinates MUST be:
 *
 * [longitude, latitude]
 *
 * Example:
 *
 * Accra:
 * [-0.1870, 5.6037]
 *
 * Kumasi:
 * [-1.6244, 6.6885]
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

    /*
     * Don't cache live traffic routes.
     */
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

            /*
             * Mapbox may return voice instruction
             * data on the step.
             */
            voiceInstruction:
              typeof step.voiceInstructions?.[0]
                ?.announcement === "string"
                ? step.voiceInstructions[0]
                    .announcement
                : instruction,
          })
        }
      }

      const congestionValues =
        route.legs
          ?.flatMap(
            (leg: any) =>
              leg.annotation
                ?.congestion ?? []
          )
          ?.filter(
            (value: unknown) =>
              typeof value === "string"
          ) ?? []

      const hasTraffic =
        options.mode ===
          "driving-traffic" ||
        congestionValues.length > 0

      const firstLeg =
        route.legs?.[0]

      const durationTypical =
        numberOrUndefined(
          firstLeg?.duration_typical
        )

      return {
        id:
          typeof route.uuid === "string"
            ? route.uuid
            : `route-${routeIndex}`,

        distance:
          numberOrUndefined(
            route.distance
          ) ?? 0,

        duration:
          numberOrUndefined(
            route.duration
          ) ?? 0,

        durationTypical,

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
          hasTraffic,
          congestion:
            congestionValues.length > 0
              ? congestionValues
              : undefined,
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
 * Convenience function for traffic-aware driving.
 *
 * Use this for your normal navigation mode.
 */
export async function getTrafficRoute(
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
      mode: "driving-traffic",
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

/**
 * Get a traffic label suitable for the UI.
 */
export function getTrafficLevel(
  route: Route
): "low" | "moderate" | "heavy" | "unknown" {
  const congestion =
    route.traffic?.congestion ?? []

  if (!congestion.length) {
    return "unknown"
  }

  let low = 0
  let moderate = 0
  let heavy = 0

  for (const value of congestion) {
    const normalized =
      value.toLowerCase()

    if (
      normalized === "low"
    ) {
      low++
    } else if (
      normalized === "moderate"
    ) {
      moderate++
    } else if (
      normalized === "heavy" ||
      normalized === "severe"
    ) {
      heavy++
    }
  }

  if (heavy > 0) {
    return "heavy"
  }

  if (moderate > 0) {
    return "moderate"
  }

  if (low > 0) {
    return "low"
  }

  return "unknown"
}