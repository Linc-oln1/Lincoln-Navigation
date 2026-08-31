"use client"

import { useEffect, useRef } from "react"
import * as maplibregl from "maplibre-gl"

/*
 * PREVIOUSLY: Leaflet cannot rotate its map, so this component
 * (also never actually rendered — see location-marker.tsx) could
 * only pan the camera; the code explicitly said "Leaflet does not
 * natively rotate the map."
 *
 * NOW: MapLibre GL supports bearing + pitch natively, so live
 * navigation gets a real Apple/Google Maps-style following camera —
 * it rotates to face the direction of travel and tilts into a 3D
 * chase view while navigating, then eases back to a flat, north-up
 * view when navigation stops.
 */

interface NavigationCameraProps {
  map: maplibregl.Map | null
  latitude: number | null
  longitude: number | null
  heading?: number | null
  navigating?: boolean
}

const NAVIGATION_PITCH = 55
const NAVIGATION_ZOOM = 17.5

export function NavigationCamera({
  map,
  latitude,
  longitude,
  heading,
  navigating = false,
}: NavigationCameraProps) {
  const wasNavigatingRef = useRef(false)

  /*
   * Follow the user's position and heading while navigating.
   */
  useEffect(() => {
    if (
      !map ||
      latitude === null ||
      longitude === null ||
      !navigating
    ) {
      return
    }

    const hasHeading =
      typeof heading === "number" && Number.isFinite(heading)

    map.easeTo({
      center: [longitude, latitude],
      zoom: Math.max(map.getZoom(), NAVIGATION_ZOOM),
      pitch: NAVIGATION_PITCH,
      bearing: hasHeading ? heading : map.getBearing(),
      duration: 700,
      easing: (t: number) => t,
    })

    wasNavigatingRef.current = true
  }, [map, latitude, longitude, heading, navigating])

  /*
   * When navigation ends, smoothly return to a flat, north-up
   * overview instead of leaving the camera tilted/rotated.
   */
  useEffect(() => {
    if (!map) return

    if (!navigating && wasNavigatingRef.current) {
      wasNavigatingRef.current = false

      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 600,
      })
    }
  }, [map, navigating])

  return null
}
