"use client"

import { useEffect } from "react"
import L from "leaflet"

interface NavigationCameraProps {
  map: L.Map | null
  latitude: number | null
  longitude: number | null
  heading?: number | null
  navigating?: boolean
}

export function NavigationCamera({
  map,
  latitude,
  longitude,
  heading,
  navigating = false,
}: NavigationCameraProps) {
  useEffect(() => {
    if (
      !map ||
      latitude === null ||
      longitude === null ||
      !navigating
    ) {
      return
    }

    const target = L.latLng(
      latitude,
      longitude
    )

    /*
     * Smoothly follow the user's position.
     */

    map.panTo(target, {
      animate: true,
      duration: 0.6,
      easeLinearity: 0.25,
      noMoveStart: true,
    })
  }, [
    map,
    latitude,
    longitude,
    navigating,
  ])

  /*
   * Keep the map following the user's
   * direction without rotating the
   * entire Leaflet map.
   *
   * The heading is intentionally accepted
   * here so the component can later support
   * a navigation camera mode.
   */

  useEffect(() => {
    if (
      !map ||
      heading === null ||
      heading === undefined ||
      !Number.isFinite(heading) ||
      !navigating
    ) {
      return
    }

    /*
     * Leaflet does not natively rotate the map.
     *
     * We therefore leave the map orientation
     * unchanged and allow LocationMarker to
     * rotate the user's direction arrow.
     */
  }, [
    map,
    heading,
    navigating,
  ])

  return null
}