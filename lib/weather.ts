// lib/weather.ts
//
// Shared client-side helper + WMO weather-code interpretation for
// the map's weather widget. Talks to our own /api/weather route
// (see app/api/weather/route.ts for why this isn't calling a
// weather provider directly from the browser).

export type Condition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "freezing-rain"
  | "snow"
  | "rain-showers"
  | "snow-showers"
  | "thunderstorm"

export interface WeatherCurrent {
  time: string
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  precipitation: number
  isDay: boolean
  code: number
}

export interface WeatherHour {
  time: string
  temp: number
  code: number
  precipProbability: number
}

export interface WeatherDay {
  date: string
  tempMax: number
  tempMin: number
  code: number
  precipProbability: number
}

export interface Weather {
  provider: "open-meteo" | "openweather"
  latitude: number
  longitude: number
  timezone: string
  // Seconds to add to a UTC timestamp to get the map location's
  // local wall-clock time. `WeatherHour.time` values are UTC ISO
  // strings — format them with this offset (see localHourLabel).
  utcOffsetSeconds: number
  current: WeatherCurrent
  hourly: WeatherHour[]
  daily: WeatherDay[]
}

/* =========================================================
   WMO WEATHER CODES

   Open-Meteo returns these natively; /api/weather maps every
   other provider onto the same table. Reference:
   https://open-meteo.com/en/docs (WMO Weather interpretation
   codes, WW).
========================================================= */

interface CodeInfo {
  condition: Condition
  label: string
}

const CODE_TABLE: Record<number, CodeInfo> = {
  0: { condition: "clear", label: "Clear sky" },
  1: { condition: "clear", label: "Mainly clear" },
  2: { condition: "partly-cloudy", label: "Partly cloudy" },
  3: { condition: "cloudy", label: "Overcast" },
  45: { condition: "fog", label: "Fog" },
  48: { condition: "fog", label: "Rime fog" },
  51: { condition: "drizzle", label: "Light drizzle" },
  53: { condition: "drizzle", label: "Drizzle" },
  55: { condition: "drizzle", label: "Heavy drizzle" },
  56: { condition: "freezing-rain", label: "Freezing drizzle" },
  57: { condition: "freezing-rain", label: "Freezing drizzle" },
  61: { condition: "rain", label: "Light rain" },
  63: { condition: "rain", label: "Rain" },
  65: { condition: "rain", label: "Heavy rain" },
  66: { condition: "freezing-rain", label: "Freezing rain" },
  67: { condition: "freezing-rain", label: "Freezing rain" },
  71: { condition: "snow", label: "Light snow" },
  73: { condition: "snow", label: "Snow" },
  75: { condition: "snow", label: "Heavy snow" },
  77: { condition: "snow", label: "Snow grains" },
  80: { condition: "rain-showers", label: "Light showers" },
  81: { condition: "rain-showers", label: "Showers" },
  82: { condition: "rain-showers", label: "Violent showers" },
  85: { condition: "snow-showers", label: "Snow showers" },
  86: { condition: "snow-showers", label: "Heavy snow showers" },
  95: { condition: "thunderstorm", label: "Thunderstorm" },
  96: { condition: "thunderstorm", label: "Thunderstorm with hail" },
  99: { condition: "thunderstorm", label: "Thunderstorm with hail" },
}

const FALLBACK: CodeInfo = { condition: "cloudy", label: "Cloudy" }

export function describeWeatherCode(code: number): CodeInfo {
  return CODE_TABLE[code] ?? FALLBACK
}

/**
 * A single emoji for a code — used where a full icon component is
 * overkill (hourly strip, compact chips). `isDay` swaps sun/moon
 * for the clear/partly-cloudy cases.
 */
export function weatherEmoji(code: number, isDay = true): string {
  const { condition } = describeWeatherCode(code)
  switch (condition) {
    case "clear":
      return isDay ? "☀️" : "🌙"
    case "partly-cloudy":
      return isDay ? "⛅" : "☁️"
    case "cloudy":
      return "☁️"
    case "fog":
      return "🌫️"
    case "drizzle":
      return "🌦️"
    case "rain":
    case "rain-showers":
      return "🌧️"
    case "freezing-rain":
      return "🌨️"
    case "snow":
    case "snow-showers":
      return "❄️"
    case "thunderstorm":
      return "⛈️"
    default:
      return "☁️"
  }
}

/**
 * Hour label ("3 PM") for a UTC timestamp, in the map location's
 * local time — shift by the offset, then format as UTC so the
 * viewer's own timezone never enters into it.
 */
export function localHourLabel(
  utcIso: string,
  utcOffsetSeconds: number
): string {
  const shifted = new Date(
    new Date(utcIso).getTime() + utcOffsetSeconds * 1000
  )
  return shifted.toLocaleTimeString([], {
    hour: "numeric",
    timeZone: "UTC",
  })
}

/**
 * Weekday label ("Mon") for a YYYY-MM-DD date already expressed in
 * the map location's local calendar.
 */
export function localDayLabel(localDate: string): string {
  return new Date(`${localDate}T00:00:00Z`).toLocaleDateString([], {
    weekday: "short",
    timeZone: "UTC",
  })
}

/**
 * Fetch current conditions + a short forecast for a coordinate.
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<Weather> {
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lng: lng.toFixed(4),
  })

  const res = await fetch(`/api/weather?${params.toString()}`, { signal })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || "Could not load the weather.")
  }

  return (await res.json()) as Weather
}
