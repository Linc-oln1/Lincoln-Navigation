import { NextRequest, NextResponse } from "next/server"

import { avoidPolygons, type AvoidCircle } from "@/lib/geo/avoid-polygon"
import { requirePro } from "@/lib/premium-guard"

/* =========================================================
   WALKING / CYCLING ROUTING PROXY  (+ "route around a hazard")

   PREVIOUSLY: lib/routing.ts sent every travel mode straight to the
   free public OSRM demo server (router.project-osrm.org). That demo
   instance only has a driving-network graph built for this region —
   it accepts "/walking/" and "/cycling/" in the URL without error,
   but silently returns the exact same distance and duration as
   "/driving/" for both. A 163km "walk" came back as 2h49m (a ~58
   km/h pace), and the turn-by-turn steps could route straight down
   motorways no pedestrian or cyclist could actually use.

   NOW: when ORS_API_KEY is set in .env.local, walking and cycling
   requests are served by OpenRouteService's Directions API instead —
   a real foot/bike routing graph, so distance, duration, and the
   turn list are all genuine. Get a free key at
   https://openrouteservice.org/dev/#/signup (no card required).

   When the key is absent, or an ORS request fails for any reason,
   lib/routing.ts catches it and falls straight back to the OSRM
   path above (the same behavior the app already had) — same
   "upgrade, never a requirement" pattern already used by
   /api/geocode (Mapbox → Nominatim) and /api/places (Google → OSM).

   ALSO: with an `avoid` query param (a JSON array of
   {lat,lng,radiusM} circles), this routes ANY mode through ORS
   `driving-car` with `options.avoid_polygons` set, so the "Route
   around it" button (Phase 3a) can get a route that genuinely skips
   the roads near a reported hazard. Same ORS_API_KEY, same response
   shape; unavailable (and the caller falls back) when the key isn't
   set.
========================================================= */

type OrsProfile = "foot-walking" | "cycling-regular" | "driving-car" | "driving-hgv"

function getOrsProfile(
  mode: string | null,
  needsCarGraph: boolean,
  truck: TruckRestrictions | null
): OrsProfile | null {
  // Truck routing (Pro) replaces the car graph for road modes.
  if (truck && (mode === "driving" || mode === "driving-traffic")) return "driving-hgv"
  if (mode === "walking") return "foot-walking"
  if (mode === "cycling") return "cycling-regular"
  // Every road mode (driving / motorcycle / bus) shares the car graph.
  if (needsCarGraph) return "driving-car"
  return null
}

/*
 * Route options (Premium): "highways" | "tolls" | "ferries" from the app
 * are translated to ORS avoid_features, and only the ones each profile
 * actually supports are sent (an unsupported feature is a 400 from ORS).
 */
const ORS_FEATURE_NAMES: Record<string, string> = {
  highways: "highways",
  tolls: "tollways",
  ferries: "ferries",
}

const ORS_SUPPORTED_FEATURES: Record<OrsProfile, string[]> = {
  "driving-car": ["highways", "tollways", "ferries"],
  "driving-hgv": ["highways", "tollways", "ferries"],
  "cycling-regular": ["ferries"],
  "foot-walking": ["ferries"],
}

function parseFeatures(raw: string | null, profile: OrsProfile): string[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((f) => ORS_FEATURE_NAMES[f.trim()])
    .filter((f): f is string => Boolean(f) && ORS_SUPPORTED_FEATURES[profile].includes(f))
}

/*
 * Truck routing (Pro): vehicle size and weight the route must fit under and
 * over. Values are clamped to sane ranges before they reach ORS.
 */
interface TruckRestrictions {
  height: number
  width: number
  length: number
  weight: number
}

function clamp(value: unknown, min: number, max: number): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null
}

function parseTruck(raw: string | null): TruckRestrictions | null {
  if (!raw) return null
  try {
    const t = JSON.parse(raw)
    const height = clamp(t?.heightM, 1, 6)
    const width = clamp(t?.widthM, 1, 4)
    const length = clamp(t?.lengthM, 2, 30)
    const weight = clamp(t?.weightT, 0.5, 100)
    if (height === null || width === null || length === null || weight === null) return null
    return { height, width, length, weight }
  } catch {
    return null
  }
}

type OrsPreference = "fastest" | "shortest" | "recommended"

function parsePreference(raw: string | null): OrsPreference | null {
  return raw === "fastest" || raw === "shortest" || raw === "recommended" ? raw : null
}

function parseAvoid(raw: string | null): AvoidCircle[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((c) => ({
        lat: Number(c.lat),
        lng: Number(c.lng),
        radiusM: c.radiusM != null ? Number(c.radiusM) : undefined,
      }))
      .filter(
        (c) =>
          Number.isFinite(c.lat) &&
          Number.isFinite(c.lng) &&
          (c.radiusM == null || Number.isFinite(c.radiusM))
      )
      .slice(0, 12)
  } catch {
    return []
  }
}

function getOrsApiKey(): string | null {
  const key = process.env.ORS_API_KEY
  return key && key.trim() ? key.trim() : null
}

/*
 * HeiGIT moved OpenRouteService to api.heigit.org. The old
 * api.openrouteservice.org host is already capped at 10% of the plan quota
 * and is switched off on 28 Sep 2026. Same API key, same paths after the
 * /openrouteservice prefix.
 */
const ORS_BASE_URL = "https://api.heigit.org/openrouteservice"

// ORS's numeric maneuver codes -> the {type, modifier} shape the
// rest of the app already speaks (see lib/routing.ts's RouteStep),
// so walking/cycling steps slot into the same UI as OSRM's.
const ORS_MANEUVER_TYPES: Record<number, { type: string; modifier?: string }> = {
  0: { type: "turn", modifier: "left" },
  1: { type: "turn", modifier: "right" },
  2: { type: "turn", modifier: "sharp left" },
  3: { type: "turn", modifier: "sharp right" },
  4: { type: "turn", modifier: "slight left" },
  5: { type: "turn", modifier: "slight right" },
  6: { type: "continue" },
  7: { type: "roundabout" },
  8: { type: "roundabout" },
  9: { type: "uturn" },
  10: { type: "arrive" },
  11: { type: "depart" },
  12: { type: "fork", modifier: "left" },
  13: { type: "fork", modifier: "right" },
}

function parseCoordinates(raw: string): [number, number][] {
  return raw.split(";").map((pair) => {
    const [lng, lat] = pair.split(",").map(Number)
    return [lng, lat] as [number, number]
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const coordinatesParam = searchParams.get("coordinates")
  const mode = searchParams.get("mode")
  const avoid = parseAvoid(searchParams.get("avoid"))
  const featuresParam = searchParams.get("features")
  const preference = parsePreference(searchParams.get("preference"))
  const wantAlternatives = searchParams.get("alternatives") === "1"
  const truck = parseTruck(searchParams.get("truck"))

  // Truck routing is a Pro feature: verify the signed plan on the server.
  if (searchParams.get("truck")) {
    const gate = requirePro(request)
    if (gate) return gate
  }

  // Any of these options needs ORS even for a road mode OSRM would handle.
  const needsCarGraph =
    avoid.length > 0 || Boolean(featuresParam) || preference === "shortest"
  const profile = getOrsProfile(mode, needsCarGraph, truck)
  const apiKey = getOrsApiKey()

  if (!coordinatesParam) {
    return NextResponse.json(
      { error: "Missing coordinates query parameter." },
      { status: 400 }
    )
  }

  if (!profile) {
    return NextResponse.json(
      { error: `Unsupported mode for OpenRouteService: "${mode}".` },
      { status: 400 }
    )
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "ORS_API_KEY is not configured." },
      { status: 501 }
    )
  }

  let coordinates: [number, number][]

  try {
    coordinates = parseCoordinates(coordinatesParam)

    if (
      coordinates.length < 2 ||
      coordinates.some(([lng, lat]) => !Number.isFinite(lng) || !Number.isFinite(lat))
    ) {
      throw new Error("Invalid coordinates.")
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid coordinates query parameter." },
      { status: 400 }
    )
  }

  try {
    const body: Record<string, unknown> = { coordinates }
    const orsOptions: Record<string, unknown> = {}
    if (avoid.length > 0) {
      orsOptions.avoid_polygons = avoidPolygons(avoid)
    }
    if (profile === "driving-hgv" && truck) {
      orsOptions.profile_params = { restrictions: truck }
    }
    const avoidFeatures = parseFeatures(featuresParam, profile)
    if (avoidFeatures.length > 0) {
      orsOptions.avoid_features = avoidFeatures
    }
    if (Object.keys(orsOptions).length > 0) {
      body.options = orsOptions
    }
    if (preference) {
      body.preference = preference
    }

    const callOrs = (withAlternatives: boolean) =>
      fetch(`${ORS_BASE_URL}/v2/directions/${profile}/geojson`, {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
          // The /geojson endpoint answers with GeoJSON; asking for plain
          // application/json gets a 406 "response format is not supported".
          Accept: "application/geo+json, application/json",
        },
        body: JSON.stringify(
          withAlternatives
            ? {
                ...body,
                alternative_routes: {
                  target_count: 3,
                  share_factor: 0.6,
                  weight_factor: 1.6,
                },
              }
            : body
        ),
        cache: "no-store",
      })

    // Alternatives are a bonus: ORS refuses them for very long routes, so
    // if that request fails, fall back to the single best route.
    let response = await callOrs(wantAlternatives)
    if (!response.ok && wantAlternatives) {
      response = await callOrs(false)
    }

    if (!response.ok) {
      let message = `OpenRouteService request failed (${response.status})`

      try {
        const errorData = await response.json()
        if (errorData?.error?.message) {
          message = errorData.error.message
        }
      } catch {
        // Ignore JSON parsing errors.
      }

      return NextResponse.json({ error: message }, { status: 502 })
    }

    const data = await response.json()
    const features: any[] = Array.isArray(data.features) ? data.features : []

    if (features.length === 0) {
      return NextResponse.json(
        { code: "NoRoute", routes: [], waypoints: [], message: "No route found." },
        { status: 200 }
      )
    }

    const routes = features.map((feature, index) => {
      const fullCoordinates: [number, number][] = feature.geometry?.coordinates ?? []
      const segment = feature.properties?.segments?.[0]

      const steps = (segment?.steps ?? []).map((step: any) => {
        const maneuver = ORS_MANEUVER_TYPES[step.type] ?? { type: "continue" }
        const [wpStart, wpEnd] = step.way_points ?? [0, fullCoordinates.length - 1]

        return {
          distance: step.distance ?? 0,
          duration: step.duration ?? 0,
          name: step.name && step.name !== "-" ? step.name : "",
          instruction:
            typeof step.instruction === "string"
              ? step.instruction
              : "Continue",
          maneuver: {
            type: maneuver.type,
            modifier: maneuver.modifier,
            location: fullCoordinates[wpStart] ?? [0, 0],
          },
          geometry: {
            type: "LineString",
            coordinates: fullCoordinates.slice(wpStart, wpEnd + 1),
          },
          voiceInstruction:
            typeof step.instruction === "string"
              ? step.instruction
              : "Continue",
        }
      })

      return {
        id: `route-${index}`,
        distance: segment?.distance ?? feature.properties?.summary?.distance ?? 0,
        duration: segment?.duration ?? feature.properties?.summary?.duration ?? 0,
        geometry: {
          type: "LineString",
          coordinates: fullCoordinates,
        },
        steps,
        summary: "",
        traffic: { hasTraffic: false },
      }
    })

    return NextResponse.json({
      code: "Ok",
      routes,
      waypoints: coordinates.map((location) => ({ name: "", location })),
    })
  } catch (error) {
    console.error("[directions] OpenRouteService error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "OpenRouteService request failed.",
      },
      { status: 502 }
    )
  }
}
