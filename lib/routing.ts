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

import type { LangCode } from "@/lib/i18n/languages"
import { translate, type MessageKey } from "@/lib/i18n/messages"

export type TravelMode =
  | "driving"
  | "driving-traffic"
  | "motorcycle"
  | "bus"
  | "walking"
  | "cycling"

export type Coordinate = [number, number]
// Coordinate format is [longitude, latitude]

export interface RoutingOptions {
  mode?: TravelMode
  alternatives?: boolean
  steps?: boolean
  overview?: "full" | "simplified" | "false"
  // Circles the route should skip (Phase 3a "route around it").
  // When set, routing goes through /api/directions (ORS) so the
  // exclusion is actually honoured; without ORS_API_KEY the caller
  // gets a normal route and should check whether it dodged them.
  avoidAreas?: Array<{ lat: number; lng: number; radiusM?: number }>
  // Language for the turn-by-turn sentences (defaults to English).
  lang?: LangCode
  // Route options (Premium). Both need the ORS-backed routing service; if it
  // isn't available the standard route comes back with optionsApplied=false.
  preference?: "fastest" | "shortest"
  avoidFeatures?: RouteAvoidFeature[]
  // Advanced traffic (Premium): ask for a time that reflects current
  // traffic. Road modes only; falls back to the standard route.
  traffic?: boolean
}

export type RouteAvoidFeature = "highways" | "tolls" | "ferries"

/** True when the request asks for something only ORS can do. */
function needsRouteOptions(options: RoutingOptions): boolean {
  return (
    options.preference === "shortest" ||
    (options.avoidFeatures?.length ?? 0) > 0
  )
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

  /** Usual (no-traffic-jam) travel time in seconds, when the source knows it. */
  typicalDuration?: number

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
  /**
   * Whether the requested route options (avoid highways/tolls/ferries,
   * shortest) were actually applied. false = the standard route was
   * returned because the options service wasn't available.
   */
  optionsApplied?: boolean
  /** true when the times include live traffic (Premium traffic routing). */
  trafficApplied?: boolean
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
 *
 * OSRM's public server also has no dedicated "motorcycle" or "bus"
 * profile — both route on the "driving" road network (the closest
 * approximation available; a bus can't use a footpath or a
 * motorcycle-only track anyway), and the real-world speed
 * differences those vehicles actually have versus a car are applied
 * separately as a duration multiplier in DURATION_MULTIPLIER below,
 * rather than pretended away by silently reporting car timings.
 */
function normalizeMode(mode: TravelMode): string {
  switch (mode) {
    case "driving":
    case "driving-traffic":
    case "motorcycle":
    case "bus":
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
 * Real-world average-speed adjustment applied on top of OSRM's
 * reported duration, for the two modes that share OSRM's "driving"
 * profile but don't actually move at car speed:
 *
 *  - motorcycle (< 1.0): in dense Accra traffic specifically,
 *    motorcycles/okada routinely move faster than cars by filtering
 *    between lanes — this is a deliberate, documented approximation
 *    (OSRM has no lane-filtering model), not a claim of precision.
 *  - bus (> 1.0): trotro/bus travel is slower than a direct car
 *    route in practice — boarding stops, indirect routing to pick
 *    up/drop off passengers, and waiting at stations.
 *
 * driving/driving-traffic/walking/cycling use OSRM's own profile
 * directly and are left at 1.0 (no adjustment).
 */
const DURATION_MULTIPLIER: Record<TravelMode, number> = {
  driving: 1,
  "driving-traffic": 1,
  motorcycle: 0.8,
  bus: 1.35,
  walking: 1,
  cycling: 1,
}

function durationMultiplierFor(mode: TravelMode): number {
  return DURATION_MULTIPLIER[mode] ?? 1
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
  roadName?: string,
  lang: LangCode = "en"
): string {
  const type = maneuver.type ?? ""
  const modifier = maneuver.modifier ?? ""
  const road = roadName?.trim()

  // One sentence per maneuver, with and without a road name; the
  // wording for each language lives in lib/i18n/map-messages.ts.
  const say = (
    plain: MessageKey,
    onto: MessageKey,
    extra: Record<string, string | number> = {}
  ) =>
    road
      ? translate(lang, onto, { road, ...extra })
      : translate(lang, plain, extra)

  if (type === "depart") return say("ins.start", "ins.startRoad")

  if (type === "arrive") return translate(lang, "ins.arrive")

  if (type === "turn") {
    if (modifier === "left") return say("ins.turnLeft", "ins.turnLeftRoad")
    if (modifier === "right") return say("ins.turnRight", "ins.turnRightRoad")
    if (modifier === "slight left")
      return say("ins.slightLeft", "ins.slightLeftRoad")
    if (modifier === "slight right")
      return say("ins.slightRight", "ins.slightRightRoad")
    if (modifier === "sharp left")
      return say("ins.sharpLeft", "ins.sharpLeftRoad")
    if (modifier === "sharp right")
      return say("ins.sharpRight", "ins.sharpRightRoad")
    return say("ins.turn", "ins.turnRoad")
  }

  if (type === "continue") return say("ins.straight", "ins.straightRoad")

  if (type === "merge") return say("ins.merge", "ins.mergeRoad")

  if (type === "fork") {
    if (modifier === "left") return say("ins.keepLeft", "ins.keepLeftRoad")
    if (modifier === "right") return say("ins.keepRight", "ins.keepRightRoad")
    return say("ins.fork", "ins.forkRoad")
  }

  if (type === "roundabout" || type === "roundabout turn") {
    if (maneuver.exit)
      return say("ins.exit", "ins.exitRoad", { n: maneuver.exit })
    return say("ins.roundabout", "ins.roundaboutRoad")
  }

  if (type === "rotary") {
    if (maneuver.exit)
      return say("ins.exit", "ins.exitRoad", { n: maneuver.exit })
    return translate(lang, "ins.rotary")
  }

  if (type === "new name") return say("ins.continue", "ins.continueRoad")

  if (type === "on ramp") return say("ins.ramp", "ins.rampRoad")

  if (type === "off ramp") return say("ins.exitRamp", "ins.exitRampRoad")

  if (type === "end of road") {
    if (modifier === "left") return say("ins.endLeft", "ins.turnLeftRoad")
    if (modifier === "right") return say("ins.endRight", "ins.turnRightRoad")
    return say("ins.endContinue", "ins.continueRoad")
  }

  if (type === "uturn") return translate(lang, "ins.uturn")

  return say("ins.continue", "ins.continueRoad")
}

/**
 * OpenRouteService hands back English sentences, but it also gives the
 * maneuver type and street name — so for any other language, rebuild
 * each step's text from those.
 */
function localizeSteps(result: RoutingResult, lang: LangCode): RoutingResult {
  if (lang === "en") return result
  return {
    ...result,
    routes: result.routes.map((route) => ({
      ...route,
      steps: route.steps.map((step) => {
        const text = buildInstruction(step.maneuver, step.name, lang)
        return { ...step, instruction: text, voiceInstruction: text }
      }),
    })),
  }
}

/**
 * Format seconds into a human-readable ETA.
 */
export interface DurationLabels {
  min: string
  hr: string
  lessThanMin: string
}

const EN_DURATION_LABELS: DurationLabels = {
  min: "min",
  hr: "hr",
  lessThanMin: "Less than 1 min",
}

export function formatDuration(
  seconds: number,
  labels: DurationLabels = EN_DURATION_LABELS
): string {
  if (!Number.isFinite(seconds)) {
    return "—"
  }

  const totalMinutes = Math.max(
    0,
    Math.round(seconds / 60)
  )

  if (totalMinutes < 1) {
    return labels.lessThanMin
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} ${labels.min}`
  }

  if (minutes === 0) {
    return `${hours} ${labels.hr}`
  }

  return `${hours} ${labels.hr} ${minutes} ${labels.min}`
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
 * OpenRouteService has a real foot/bike routing graph, unlike the
 * public OSRM demo server this file otherwise talks to (which only
 * hosts a driving-network graph for this region and silently
 * returns car timings for "/walking/" and "/cycling/" alike — see
 * app/api/directions/route.ts for how that was found). Only called
 * for those two modes; every other mode goes straight to OSRM as
 * before. Returns null (never throws) so the caller can fall back
 * to OSRM exactly as if this function didn't exist, whether that's
 * because ORS_API_KEY isn't configured or the request just failed.
 */
async function tryOpenRouteService(
  coordinates: Coordinate[],
  options: RoutingOptions
): Promise<RoutingResult | null> {
  const mode = options.mode ?? "driving"
  const avoidAreas = options.avoidAreas ?? []

  // ORS is used for walking/cycling (real foot/bike graph) and for
  // any mode when an avoid area is requested (OSRM can't exclude
  // arbitrary areas). Everything else stays on OSRM.
  if (
    mode !== "walking" &&
    mode !== "cycling" &&
    avoidAreas.length === 0 &&
    !needsRouteOptions(options)
  ) {
    return null
  }

  try {
    const coordinateString = coordinates
      .map(([lng, lat]) => `${lng},${lat}`)
      .join(";")

    const params = new URLSearchParams({
      coordinates: coordinateString,
      mode,
    })

    if (avoidAreas.length > 0) {
      params.set("avoid", JSON.stringify(avoidAreas))
    }
    if (options.preference) {
      params.set("preference", options.preference)
    }
    if (options.avoidFeatures && options.avoidFeatures.length > 0) {
      params.set("features", options.avoidFeatures.join(","))
    }
    if (options.alternatives) {
      params.set("alternatives", "1")
    }

    const response = await fetch(
      `/api/directions?${params.toString()}`,
      { cache: "no-store" }
    )

    if (!response.ok) return null

    const data = (await response.json()) as RoutingResult

    if (data.code !== "Ok" || !data.routes?.length) return null

    return data
  } catch {
    return null
  }
}

/**
 * Calculate a route between two or more points.
 *
 * Coordinates MUST be [longitude, latitude], e.g.:
 *
 * Accra: [-0.1870, 5.6037]
 * Kumasi: [-1.6244, 6.6885]
 */
const TRAFFIC_ROUTE_MODES: TravelMode[] = [
  "driving",
  "driving-traffic",
  "motorcycle",
  "bus",
]

/** Traffic-aware routes via our Premium proxy; null = use the normal route. */
async function tryTrafficRoute(
  coordinates: Coordinate[],
  options: RoutingOptions
): Promise<any | null> {
  if (!options.traffic) return null
  if (!TRAFFIC_ROUTE_MODES.includes(options.mode ?? "driving")) return null

  try {
    const params = new URLSearchParams({
      coordinates: coordinates.map(([lng, lat]) => `${lng},${lat}`).join(";"),
    })
    if (options.alternatives) params.set("alternatives", "1")

    const response = await fetch(`/api/traffic-directions?${params}`, {
      cache: "no-store",
    })
    if (!response.ok) return null

    const data = await response.json()
    if (data.code !== "Ok" || !data.routes?.length) return null
    return data
  } catch {
    return null
  }
}

export async function calculateRoute(
  coordinates: Coordinate[],
  options: RoutingOptions = {}
): Promise<RoutingResult> {
  const orsResult = await tryOpenRouteService(coordinates, options)

  if (orsResult) {
    return {
      ...localizeSteps(orsResult, options.lang ?? "en"),
      optionsApplied: true,
    }
  }

  const trafficData = await tryTrafficRoute(coordinates, options)

  let data: any
  if (trafficData) {
    data = trafficData
  } else {
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

    data = await response.json()

    if (data.code !== "Ok") {
      throw new Error(
        data.message ||
          `Routing failed with code: ${data.code}`
      )
    }
  }

  const durationMultiplier = durationMultiplierFor(
    options.mode ?? "driving"
  )

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
              step.name,
              options.lang ?? "en"
            )

          steps.push({
            distance:
              numberOrUndefined(
                step.distance
              ) ?? 0,

            duration:
              (numberOrUndefined(
                step.duration
              ) ?? 0) * durationMultiplier,

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
          (numberOrUndefined(
            route.duration
          ) ?? 0) * durationMultiplier,

        typicalDuration:
          numberOrUndefined(route.duration_typical),

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

    // OSRM can't honour avoid/shortest, so those options weren't applied.
    optionsApplied: !needsRouteOptions(options),

    trafficApplied: Boolean(trafficData),
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
