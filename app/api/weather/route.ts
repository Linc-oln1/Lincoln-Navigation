import { NextRequest, NextResponse } from "next/server"

/* =========================================================
   WEATHER PROXY

   A single server route that turns a coordinate into current
   conditions + a short forecast for the area the map is
   showing. Same "free provider works out of the box, paid key
   is an upgrade" pattern already used by /api/geocode
   (Mapbox → Nominatim) and /api/places (Google → Overpass):

     - DEFAULT: Open-Meteo (https://open-meteo.com) — free, no
       API key, no attribution burden, genuinely good global
       coverage. This is what runs in production today.

     - UPGRADE: when OPENWEATHER_API_KEY is set in the server
       environment, OpenWeatherMap is queried first and
       Open-Meteo becomes the safety net. OpenWeather is never
       required — an unset key just means the free path is used.

   Everything is normalized to WMO weather codes (what Open-Meteo
   returns natively) so the client only has to understand one
   code table regardless of which provider answered. See
   lib/weather.ts for the code → label/condition mapping shared
   with the UI.

   Responses are cached in-process for a few minutes, keyed to a
   coarse lat/lng grid, so panning the map doesn't hammer either
   provider.
========================================================= */

export const runtime = "nodejs"

interface NormalizedWeather {
  provider: "open-meteo" | "openweather"
  latitude: number
  longitude: number
  timezone: string
  // Seconds to add to a UTC time to get the map location's local
  // wall-clock time. The client formats every timestamp below with
  // this offset so "next 12 hours" reads in the place's own time,
  // not the viewer's.
  utcOffsetSeconds: number
  current: {
    time: string
    temp: number
    feelsLike: number
    humidity: number
    windSpeed: number
    precipitation: number
    isDay: boolean
    code: number
  }
  hourly: Array<{
    time: string
    temp: number
    code: number
    precipProbability: number
  }>
  daily: Array<{
    date: string
    tempMax: number
    tempMin: number
    code: number
    precipProbability: number
  }>
}

/* ---------------------------------------------------------
   In-process cache
--------------------------------------------------------- */

interface CacheEntry {
  expires: number
  data: NormalizedWeather
}

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, CacheEntry>()

function cacheKey(lat: number, lng: number): string {
  // ~0.1° grid (≈11 km) — fine enough for "the weather here",
  // coarse enough that small pans reuse a cached answer.
  return `${lat.toFixed(1)},${lng.toFixed(1)}`
}

function getCached(key: string): NormalizedWeather | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expires < Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.data
}

function setCached(key: string, data: NormalizedWeather): void {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data })
  if (cache.size > 300) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

/* ---------------------------------------------------------
   Open-Meteo (free, default)
--------------------------------------------------------- */

async function fetchOpenMeteo(
  lat: number,
  lng: number
): Promise<NormalizedWeather> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    timeformat: "unixtime", // unambiguous UTC epoch seconds
    forecast_days: "5",
  })

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { cache: "no-store" }
  )

  if (!res.ok) {
    throw new Error(`Open-Meteo request failed (${res.status})`)
  }

  const data = await res.json()
  const c = data.current ?? {}
  const offsetSec = Number(data.utc_offset_seconds ?? 0)

  // Every time value below is now UTC epoch seconds. `date` fields
  // are rendered as the location-local calendar day (offset applied)
  // so "Today"/weekday labels line up with the place, not UTC.
  const toIso = (sec: unknown) =>
    new Date(Number(sec) * 1000).toISOString()
  const toLocalDate = (sec: unknown) =>
    new Date((Number(sec) + offsetSec) * 1000).toISOString().slice(0, 10)

  // Hourly: keep the 24 hours starting from the current hour.
  const hourlyTimes: number[] = data.hourly?.time ?? []
  const nowSec = Date.now() / 1000
  let startIdx = hourlyTimes.findIndex((t) => t >= nowSec - 3600)
  if (startIdx < 0) startIdx = 0

  const hourly = hourlyTimes
    .slice(startIdx, startIdx + 24)
    .map((time, i) => {
      const idx = startIdx + i
      return {
        time: toIso(time),
        temp: round(data.hourly?.temperature_2m?.[idx]),
        code: Number(data.hourly?.weather_code?.[idx] ?? 0),
        precipProbability: Number(
          data.hourly?.precipitation_probability?.[idx] ?? 0
        ),
      }
    })

  const dailyDates: number[] = data.daily?.time ?? []
  const daily = dailyDates.map((date, i) => ({
    date: toLocalDate(date),
    tempMax: round(data.daily?.temperature_2m_max?.[i]),
    tempMin: round(data.daily?.temperature_2m_min?.[i]),
    code: Number(data.daily?.weather_code?.[i] ?? 0),
    precipProbability: Number(
      data.daily?.precipitation_probability_max?.[i] ?? 0
    ),
  }))

  return {
    provider: "open-meteo",
    latitude: Number(data.latitude ?? lat),
    longitude: Number(data.longitude ?? lng),
    timezone: data.timezone ?? "auto",
    utcOffsetSeconds: offsetSec,
    current: {
      time: c.time ? toIso(c.time) : new Date().toISOString(),
      temp: round(c.temperature_2m),
      feelsLike: round(c.apparent_temperature ?? c.temperature_2m),
      humidity: Number(c.relative_humidity_2m ?? 0),
      windSpeed: round(c.wind_speed_10m),
      precipitation: Number(c.precipitation ?? 0),
      isDay: Number(c.is_day ?? 1) === 1,
      code: Number(c.weather_code ?? 0),
    },
    hourly,
    daily,
  }
}

/* ---------------------------------------------------------
   OpenWeatherMap (optional upgrade)

   Uses the key-friendly free endpoints (/data/2.5/weather +
   /data/2.5/forecast, 3-hourly). OpenWeather condition codes
   are mapped to the nearest WMO code so the client stays
   provider-agnostic.
--------------------------------------------------------- */

function owmToWmo(owmCode: number): number {
  if (owmCode >= 200 && owmCode < 300) return 95 // thunderstorm
  if (owmCode >= 300 && owmCode < 400) return 51 // drizzle
  if (owmCode >= 500 && owmCode < 600) {
    if (owmCode === 511) return 66 // freezing rain
    if (owmCode >= 520) return 80 // rain showers
    return 61 // rain
  }
  if (owmCode >= 600 && owmCode < 700) {
    if (owmCode >= 620) return 85 // snow showers
    return 71 // snow
  }
  if (owmCode >= 700 && owmCode < 800) return 45 // atmosphere → fog
  if (owmCode === 800) return 0 // clear
  if (owmCode === 801) return 1 // mainly clear
  if (owmCode === 802) return 2 // partly cloudy
  if (owmCode >= 803) return 3 // overcast
  return 0
}

async function fetchOpenWeather(
  lat: number,
  lng: number,
  apiKey: string
): Promise<NormalizedWeather> {
  const base = "https://api.openweathermap.org/data/2.5"
  const common = `lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${base}/weather?${common}`, { cache: "no-store" }),
    fetch(`${base}/forecast?${common}`, { cache: "no-store" }),
  ])

  if (!currentRes.ok) {
    throw new Error(`OpenWeather current failed (${currentRes.status})`)
  }
  if (!forecastRes.ok) {
    throw new Error(`OpenWeather forecast failed (${forecastRes.status})`)
  }

  const current = await currentRes.json()
  const forecast = await forecastRes.json()

  const tzOffsetSec = Number(current.timezone ?? 0)
  const sunrise = Number(current.sys?.sunrise ?? 0)
  const sunset = Number(current.sys?.sunset ?? 0)
  const nowSec = Math.floor(Date.now() / 1000)
  const isDay =
    sunrise && sunset ? nowSec >= sunrise && nowSec < sunset : true

  const list: any[] = Array.isArray(forecast.list) ? forecast.list : []

  const hourly = list.slice(0, 8).map((item) => ({
    time: new Date(item.dt * 1000).toISOString(),
    temp: round(item.main?.temp),
    code: owmToWmo(Number(item.weather?.[0]?.id ?? 800)),
    precipProbability: Math.round(Number(item.pop ?? 0) * 100),
  }))

  // Collapse the 3-hourly forecast into per-day min/max.
  const byDay = new Map<
    string,
    { min: number; max: number; codes: number[]; pop: number }
  >()
  for (const item of list) {
    const date = new Date(item.dt * 1000 + tzOffsetSec * 1000)
      .toISOString()
      .slice(0, 10)
    const temp = Number(item.main?.temp ?? 0)
    const entry = byDay.get(date) ?? {
      min: temp,
      max: temp,
      codes: [],
      pop: 0,
    }
    entry.min = Math.min(entry.min, Number(item.main?.temp_min ?? temp))
    entry.max = Math.max(entry.max, Number(item.main?.temp_max ?? temp))
    entry.codes.push(owmToWmo(Number(item.weather?.[0]?.id ?? 800)))
    entry.pop = Math.max(entry.pop, Number(item.pop ?? 0))
    byDay.set(date, entry)
  }

  const daily = Array.from(byDay.entries())
    .slice(0, 5)
    .map(([date, entry]) => ({
      date,
      tempMax: round(entry.max),
      tempMin: round(entry.min),
      // Most "severe" code of the day reads better than an average.
      code: entry.codes.reduce((a, b) => (b > a ? b : a), 0),
      precipProbability: Math.round(entry.pop * 100),
    }))

  return {
    provider: "openweather",
    latitude: lat,
    longitude: lng,
    timezone: current.name || "local",
    utcOffsetSeconds: tzOffsetSec,
    current: {
      time: new Date().toISOString(),
      temp: round(current.main?.temp),
      feelsLike: round(current.main?.feels_like ?? current.main?.temp),
      humidity: Number(current.main?.humidity ?? 0),
      windSpeed: round(Number(current.wind?.speed ?? 0) * 3.6), // m/s → km/h
      precipitation: Number(
        current.rain?.["1h"] ?? current.snow?.["1h"] ?? 0
      ),
      isDay,
      code: owmToWmo(Number(current.weather?.[0]?.id ?? 800)),
    },
    hourly,
    daily,
  }
}

function round(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

/* ---------------------------------------------------------
   Route handler
--------------------------------------------------------- */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const lat = Number.parseFloat(searchParams.get("lat") ?? "")
  const lng = Number.parseFloat(searchParams.get("lng") ?? "")

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: "Valid lat and lng query parameters are required." },
      { status: 400 }
    )
  }

  const key = cacheKey(lat, lng)
  const cached = getCached(key)
  if (cached) {
    return NextResponse.json(cached)
  }

  const openWeatherKey = process.env.OPENWEATHER_API_KEY?.trim()

  try {
    let data: NormalizedWeather

    if (openWeatherKey) {
      try {
        data = await fetchOpenWeather(lat, lng, openWeatherKey)
      } catch (error) {
        console.error(
          "[weather] OpenWeather failed, falling back to Open-Meteo:",
          error
        )
        data = await fetchOpenMeteo(lat, lng)
      }
    } else {
      data = await fetchOpenMeteo(lat, lng)
    }

    setCached(key, data)

    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          "public, s-maxage=600, stale-while-revalidate=1800",
      },
    })
  } catch (error) {
    console.error("[weather] error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Weather request failed.",
      },
      { status: 502 }
    )
  }
}
