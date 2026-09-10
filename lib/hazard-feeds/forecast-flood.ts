// lib/hazard-feeds/forecast-flood.ts  (server only)
//
// Turns the static "flood-prone corridor" seed zones into something
// honest: a zone is only shown when the rain forecast for it is
// actually bad. On a dry day the flood markers simply aren't there.
//
// This is a forecast-derived advisory, not an official warning and
// not a live observation — every surface labels it that way. Ghana's
// urban flooding (Circle / Odawna / Alajo …) is flash flooding driven
// by short intense rain over blocked drains, so the signal here is
// short-term rainfall accumulation + probability, not river gauges.
//
// Keyless (Open-Meteo), so this works in production regardless of
// whether the community-report store is configured.

import { HAZARD_SEED } from "@/lib/geo-intelligence/route-intelligence"
import type { LatLng } from "@/lib/geo-intelligence/types"
import type { Hazard } from "@/lib/hazards"
import type { HazardFeed } from "./types"

// A zone escalates to a warning when, over the next few hours, the
// peak rain probability and the total accumulation both cross these.
const WINDOW_HOURS = 6
const PROBABILITY_THRESHOLD = 70 // %
const ACCUMULATION_THRESHOLD_MM = 8

const HAZARD_TTL_MS = 3 * 60 * 60 * 1000
const CACHE_TTL_MS = 30 * 60 * 1000

interface CacheEntry {
  expires: number
  data: Hazard[]
}
let cache: CacheEntry | null = null

function centroid(points: LatLng[]): LatLng {
  if (points.length === 0) return { lat: 0, lng: 0 }
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  )
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

interface ZoneForecast {
  maxProbability: number
  accumulationMm: number
}

async function fetchZoneForecasts(
  points: LatLng[]
): Promise<ZoneForecast[]> {
  if (points.length === 0) return []

  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(4)).join(","),
    longitude: points.map((p) => p.lng.toFixed(4)).join(","),
    hourly: "precipitation,precipitation_probability",
    forecast_days: "2",
    timeformat: "unixtime",
    timezone: "UTC",
  })

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { cache: "no-store" }
  )
  if (!res.ok) throw new Error(`Open-Meteo forecast failed (${res.status})`)

  const body = await res.json()
  // Open-Meteo returns a single object for one location, an array
  // for several.
  const entries: any[] = Array.isArray(body) ? body : [body]
  const nowSec = Date.now() / 1000
  const windowEnd = nowSec + WINDOW_HOURS * 3600

  return points.map((_, i) => {
    const hourly = entries[i]?.hourly ?? {}
    const times: number[] = hourly.time ?? []
    let maxProbability = 0
    let accumulationMm = 0

    times.forEach((t, idx) => {
      if (t < nowSec - 3600 || t > windowEnd) return
      maxProbability = Math.max(
        maxProbability,
        Number(hourly.precipitation_probability?.[idx] ?? 0)
      )
      accumulationMm += Number(hourly.precipitation?.[idx] ?? 0)
    })

    return { maxProbability, accumulationMm }
  })
}

/**
 * The flood-prone seed zones that are currently under a heavy-rain
 * forecast, as `Hazard`s with `source: "forecast"`. Empty when the
 * forecast is dry everywhere. Cached in-process for 30 minutes.
 */
export async function getForecastFloodHazards(): Promise<Hazard[]> {
  if (cache && cache.expires > Date.now()) return cache.data

  const zones = HAZARD_SEED.filter((z) => z.kind === "flood")
  const points = zones.map((z) => centroid(z.polygonOrLine))

  let data: Hazard[] = []
  try {
    const forecasts = await fetchZoneForecasts(points)
    const now = Date.now()

    data = zones.flatMap((zone, i) => {
      const f = forecasts[i]
      if (
        !f ||
        f.maxProbability < PROBABILITY_THRESHOLD ||
        f.accumulationMm < ACCUMULATION_THRESHOLD_MM
      ) {
        return []
      }

      const severity = Math.min(
        0.9,
        Math.max(0.45, 0.45 + f.accumulationMm / 40)
      )

      return [
        {
          id: `ff-${zone.id}`,
          kind: "flood" as const,
          location: points[i],
          note: `${zone.description} — heavy rain forecast (~${Math.round(
            f.accumulationMm
          )} mm next ${WINDOW_HOURS}h)`,
          source: "forecast" as const,
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + HAZARD_TTL_MS).toISOString(),
          confirmedCount: 0,
          clearedCount: 0,
          severity,
          status: "active" as const,
        },
      ]
    })
  } catch (error) {
    console.error("[forecast-flood] lookup failed:", error)
    data = []
  }

  cache = { expires: Date.now() + CACHE_TTL_MS, data }
  return data
}

export const forecastFloodFeed: HazardFeed = {
  id: "forecast-flood",
  label: "Flood-prone corridors under a heavy-rain forecast (Open-Meteo)",
  fetch: getForecastFloodHazards,
}
