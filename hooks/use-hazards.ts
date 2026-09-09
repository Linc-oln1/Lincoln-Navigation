"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchHazards, type BBox, type Hazard } from "@/lib/hazards"

/* Community hazard reports for the area the map is showing.
   Refetches (debounced) when the visible bounds change and polls
   every 2 minutes. Mirrors hooks/use-weather.ts. */

const POLL_MS = 2 * 60 * 1000
const DEBOUNCE_MS = 600

interface UseHazardsResult {
  hazards: Hazard[]
  isLoading: boolean
  error: string | null
  /** false when the server has no shared store configured. */
  configured: boolean
  /** Merge a freshly reported/voted hazard into local state now. */
  upsert: (hazard: Hazard) => void
  /** Drop a hazard from local state (e.g. it was cleared). */
  remove: (id: string) => void
  refresh: () => void
}

function sameBBox(a: BBox | null, b: BBox | null): boolean {
  if (!a || !b) return a === b
  return (
    Math.abs(a.minLng - b.minLng) < 1e-4 &&
    Math.abs(a.minLat - b.minLat) < 1e-4 &&
    Math.abs(a.maxLng - b.maxLng) < 1e-4 &&
    Math.abs(a.maxLat - b.maxLat) < 1e-4
  )
}

export function useHazards(bbox: BBox | null): UseHazardsResult {
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState(true)

  const bboxRef = useRef<BBox | null>(null)
  const [tick, setTick] = useState(0)

  const load = useCallback((target: BBox, signal: AbortSignal) => {
    setIsLoading(true)
    setError(null)

    fetchHazards(target, signal)
      .then((res) => {
        if (signal.aborted) return
        setHazards(res.hazards)
        setConfigured(res.configured)
      })
      .catch((err) => {
        if (signal.aborted) return
        setError(err instanceof Error ? err.message : "Could not load hazards.")
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false)
      })
  }, [])

  // Debounced fetch on bounds change / manual refresh.
  useEffect(() => {
    if (!bbox) return

    const changed = !sameBBox(bbox, bboxRef.current)
    const controller = new AbortController()

    const run = () => {
      bboxRef.current = bbox
      load(bbox, controller.signal)
    }

    const timer = setTimeout(run, changed ? DEBOUNCE_MS : 0)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox?.minLng, bbox?.minLat, bbox?.maxLng, bbox?.maxLat, tick, load])

  // Periodic poll of the current bounds.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), POLL_MS)
    return () => clearInterval(id)
  }, [])

  const upsert = useCallback((hazard: Hazard) => {
    setHazards((prev) => {
      const next = prev.filter((h) => h.id !== hazard.id)
      if (hazard.status === "active") next.push(hazard)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setHazards((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const refresh = useCallback(() => {
    bboxRef.current = null
    setTick((t) => t + 1)
  }, [])

  return { hazards, isLoading, error, configured, upsert, remove, refresh }
}
