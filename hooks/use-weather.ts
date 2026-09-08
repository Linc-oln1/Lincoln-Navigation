"use client"

import { useEffect, useRef, useState } from "react"
import { fetchWeather, type Weather } from "@/lib/weather"

/* Weather for the area the map is currently showing. Refetches
   when the map center moves more than ~15 km, and refreshes the
   current spot every 15 minutes. The /api/weather route caches
   on a coarse grid, so small pans that land in the same cell
   never hit the network. */

const REFRESH_MS = 15 * 60 * 1000

// Rough distance gate in degrees (~0.15° ≈ 16 km at Ghana's
// latitude). Below this we treat it as "the same place" and keep
// the current reading.
const MOVE_THRESHOLD_DEG = 0.15

interface UseWeatherResult {
  weather: Weather | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useWeather(
  center: [number, number] | null
): UseWeatherResult {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The coordinate the current reading was fetched for.
  const fetchedForRef = useRef<[number, number] | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!center) return

    const [lat, lng] = center
    const last = fetchedForRef.current
    const movedEnough =
      !last ||
      Math.abs(last[0] - lat) > MOVE_THRESHOLD_DEG ||
      Math.abs(last[1] - lng) > MOVE_THRESHOLD_DEG

    if (!movedEnough && refreshKey === 0 && weather) return

    const controller = new AbortController()
    let cancelled = false

    setIsLoading(true)
    setError(null)

    fetchWeather(lat, lng, controller.signal)
      .then((data) => {
        if (cancelled) return
        fetchedForRef.current = [lat, lng]
        setWeather(data)
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return
        setError(
          err instanceof Error ? err.message : "Could not load the weather."
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
    // `weather` is intentionally not a dep — it's read only as a
    // "do we already have something" guard, and adding it would
    // refetch on every successful load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], refreshKey])

  // Periodic refresh of whatever spot we're currently showing.
  useEffect(() => {
    const id = setInterval(() => {
      fetchedForRef.current = null
      setRefreshKey((k) => k + 1)
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  return {
    weather,
    isLoading,
    error,
    refresh: () => {
      fetchedForRef.current = null
      setRefreshKey((k) => k + 1)
    },
  }
}
