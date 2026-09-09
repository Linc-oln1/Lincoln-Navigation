"use client"

import { useEffect, useRef, useState } from "react"

import { fetchHazards } from "@/lib/hazards"
import {
  hazardsOnRoute,
  routeBBox,
  type OnRouteHazard,
  type RoutePoint,
} from "@/lib/hazard-geometry"

/* Hazards that lie on a calculated route. Fetches /api/hazards once
   for the route's bounding box (the map's useHazards only covers
   the visible viewport — a long route runs well past it) and
   filters to the ones actually near the line.

   Returns nothing when there's no route, or when no store is
   configured and no seed zone is near the route. */

interface UseRouteHazardsResult {
  hazards: OnRouteHazard[]
  isLoading: boolean
}

function routeKey(coords: RoutePoint[] | null): string {
  if (!coords || coords.length < 2) return ""
  const first = coords[0]
  const last = coords[coords.length - 1]
  return `${coords.length}:${first[0].toFixed(4)},${first[1].toFixed(4)}:${last[0].toFixed(4)},${last[1].toFixed(4)}`
}

export function useRouteHazards(
  coords: RoutePoint[] | null
): UseRouteHazardsResult {
  const [hazards, setHazards] = useState<OnRouteHazard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const key = routeKey(coords)
  const coordsRef = useRef(coords)
  coordsRef.current = coords

  useEffect(() => {
    const current = coordsRef.current
    if (!current || current.length < 2) {
      setHazards([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    fetchHazards(routeBBox(current), controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return
        setHazards(hazardsOnRoute(current, res.hazards))
      })
      .catch(() => {
        if (!controller.signal.aborted) setHazards([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [key])

  return { hazards, isLoading }
}
