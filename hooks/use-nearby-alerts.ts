"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { haversineMeters } from "@/lib/geo-intelligence/confidence"
import { fetchHazards, type Hazard } from "@/lib/hazards"

/* Road alerts around the user's own position (Premium "Real-time road
   alerts"). Independent of where the map is panned: it watches a fixed
   radius around the device's location and polls every minute, and reports
   which hazards appeared since the last look so the UI can announce them. */

export const ALERT_RADIUS_M = 5000
const POLL_MS = 60 * 1000

export interface NearbyAlert {
  hazard: Hazard
  distanceM: number
}

const DEG_LAT_M = 111_320

function boxAround(lat: number, lng: number, radiusM: number) {
  const dLat = radiusM / DEG_LAT_M
  const dLng = radiusM / (DEG_LAT_M * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng }
}

export function useNearbyAlerts(enabled: boolean, position: [number, number] | null) {
  const [alerts, setAlerts] = useState<NearbyAlert[]>([])
  const [fresh, setFresh] = useState<NearbyAlert[]>([])
  const [tick, setTick] = useState(0)
  const seenRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setTick((n) => n + 1), POLL_MS)
    return () => clearInterval(id)
  }, [enabled])

  // Refetch when the device crosses into a new ~1 km square (or on the
  // timer), not on every GPS fix.
  const cell = position ? `${position[0].toFixed(2)},${position[1].toFixed(2)}` : null
  const positionRef = useRef(position)
  positionRef.current = position

  useEffect(() => {
    const here = positionRef.current
    if (!enabled || !here) return
    const [lat, lng] = here
    const controller = new AbortController()
    fetchHazards(boxAround(lat, lng, ALERT_RADIUS_M), controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return
        const nearby = res.hazards
          .filter((h) => h.status === "active")
          .map((hazard) => ({
            hazard,
            distanceM: haversineMeters({ lat, lng }, hazard.location),
          }))
          .filter((a) => a.distanceM <= ALERT_RADIUS_M)
          .sort((a, b) => a.distanceM - b.distanceM)
        setAlerts(nearby)

        // The first look only establishes what's already there.
        const seen = seenRef.current
        if (!seen) {
          seenRef.current = new Set(nearby.map((a) => a.hazard.id))
          return
        }
        const added = nearby.filter((a) => !seen.has(a.hazard.id))
        for (const a of added) seen.add(a.hazard.id)
        if (added.length) setFresh(added)
      })
      .catch(() => {})

    return () => controller.abort()
  }, [enabled, cell, tick])

  const dismissFresh = useCallback(() => setFresh([]), [])

  return { alerts, fresh, dismissFresh }
}
