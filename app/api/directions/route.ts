import { NextRequest, NextResponse } from "next/server"

/* =========================================================
   WALKING / CYCLING ROUTING PROXY

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
========================================================= */

type OrsProfile = "foot-walking" | "cycling-regular"

function getOrsProfile(mode: string | null): OrsProfile | null {
  if (mode === "walking") return "foot-walking"
  if (mode === "cycling") return "cycling-regular"
  return null
}

function getOrsApiKey(): string | null {
  const key = process.env.ORS_API_KEY
  return key && key.trim() ? key.trim() : null
}

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

  const profile = getOrsProfile(mode)
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
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ coordinates }),
        cache: "no-store",
      }
    )

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
    const feature = data.features?.[0]

    if (!feature) {
      return NextResponse.json(
        { code: "NoRoute", routes: [], waypoints: [], message: "No route found." },
        { status: 200 }
      )
    }

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

    const route = {
      id: "route-0",
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

    return NextResponse.json({
      code: "Ok",
      routes: [route],
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
