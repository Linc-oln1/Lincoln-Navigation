"use client"

import { useEffect, useRef } from "react"
import * as maplibregl from "maplibre-gl"

/*
 * PREVIOUSLY: this component was written against the Leaflet API
 * (L.Marker / L.divIcon) — but map-view.tsx used a MapLibre-style
 * config and never actually rendered <LocationMarker>, so the nice
 * pulsing/heading GPS dot below was completely dead code. The map
 * only ever showed a plain static blue circle.
 *
 * NOW: ported to MapLibre GL's Marker API and actually rendered by
 * map-view.tsx, so live position + heading + accuracy show up on
 * the map for real.
 */

interface LocationMarkerProps {
  map: maplibregl.Map | null
  longitude: number | null
  latitude: number | null
  heading?: number | null
  accuracy?: number | null
  navigating?: boolean
}

export function LocationMarker({
  map,
  longitude,
  latitude,
  heading,
  accuracy,
  navigating = false,
}: LocationMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const elementRef = useRef<HTMLDivElement | null>(null)

  /*
   * ============================================================
   * CREATE LOCATION MARKER
   * ============================================================
   */

  useEffect(() => {
    if (!map) return

    const element = document.createElement("div")

    element.className = "lincoln-location-marker"

    element.innerHTML = `
      <div class="lincoln-location-accuracy"></div>

      <div class="lincoln-location-pulse"></div>

      <div class="lincoln-location-heading">
        <div class="lincoln-heading-arrow"></div>
      </div>

      <div class="lincoln-location-dot">
        <div class="lincoln-location-dot-inner"></div>
      </div>
    `

    element.style.width = "46px"
    element.style.height = "46px"
    element.style.visibility = "hidden"

    elementRef.current = element

    const marker = new maplibregl.Marker({
      element,
      anchor: "center",
      // Always face the viewer, even if the map is pitched
      // during live navigation — matches how Apple/Google Maps
      // render the "you are here" puck.
      pitchAlignment: "viewport",
      rotationAlignment: "viewport",
    }).setLngLat([0, 0])

    marker.addTo(map)

    markerRef.current = marker

    return () => {
      marker.remove()
      markerRef.current = null
      elementRef.current = null
    }
  }, [map])

  /*
   * ============================================================
   * UPDATE GPS POSITION
   * ============================================================
   */

  useEffect(() => {
    if (
      !markerRef.current ||
      longitude === null ||
      latitude === null
    ) {
      return
    }

    markerRef.current.setLngLat([longitude, latitude])

    if (elementRef.current) {
      elementRef.current.style.visibility = "visible"
    }
  }, [longitude, latitude])

  /*
   * ============================================================
   * UPDATE HEADING
   * ============================================================
   */

  useEffect(() => {
    if (!elementRef.current) return

    const headingElement =
      elementRef.current.querySelector(
        ".lincoln-location-heading"
      ) as HTMLElement | null

    if (!headingElement) return

    const hasHeading =
      typeof heading === "number" &&
      Number.isFinite(heading)

    headingElement.style.transform = `rotate(${
      hasHeading ? heading : 0
    }deg)`

    // Only show the direction arrow once we actually know a
    // heading — an ambient (non-moving) dot shouldn't imply a
    // direction it doesn't have.
    headingElement.style.opacity = hasHeading ? "1" : "0"
  }, [heading])

  /*
   * ============================================================
   * UPDATE GPS ACCURACY
   * ============================================================
   */

  useEffect(() => {
    if (!elementRef.current) return

    const accuracyElement =
      elementRef.current.querySelector(
        ".lincoln-location-accuracy"
      ) as HTMLElement | null

    if (!accuracyElement) return

    const safeAccuracy =
      typeof accuracy === "number" &&
      Number.isFinite(accuracy)
        ? Math.max(10, Math.min(accuracy, 100))
        : 30

    /*
     * Visual representation of GPS accuracy.
     *
     * This is intentionally a lightweight screen-space circle
     * rather than a geographic radius layer.
     */

    const size = Math.max(
      44,
      Math.min(safeAccuracy * 1.5, 130)
    )

    accuracyElement.style.width = `${size}px`
    accuracyElement.style.height = `${size}px`
    accuracyElement.style.left = `${(46 - size) / 2}px`
    accuracyElement.style.top = `${(46 - size) / 2}px`
  }, [accuracy])

  /*
   * ============================================================
   * NAVIGATION MODE
   * ============================================================
   */

  useEffect(() => {
    if (!elementRef.current) return

    elementRef.current.classList.toggle(
      "lincoln-navigation-active",
      navigating
    )
  }, [navigating])

  return (
    <style jsx global>{`
      /*
       * ========================================================
       * MAPLIBRE LOCATION MARKER
       * ========================================================
       */

      .lincoln-location-marker {
        position: relative;
        width: 46px;
        height: 46px;

        pointer-events: none;

        transform-origin: center center;

        user-select: none;
      }

      /*
       * ========================================================
       * GPS ACCURACY
       * ========================================================
       */

      .lincoln-location-accuracy {
        position: absolute;

        border-radius: 9999px;

        background: rgba(37, 99, 235, 0.14);

        border: 1px solid rgba(96, 165, 250, 0.32);

        pointer-events: none;

        transition:
          width 0.3s ease,
          height 0.3s ease,
          left 0.3s ease,
          top 0.3s ease;
      }

      /*
       * ========================================================
       * LOCATION PULSE
       * ========================================================
       */

      .lincoln-location-pulse {
        position: absolute;

        width: 46px;
        height: 46px;

        left: 0;
        top: 0;

        border-radius: 50%;

        background: rgba(37, 99, 235, 0.18);

        animation: lincolnLocationPulse 2s infinite;

        pointer-events: none;
      }

      /*
       * ========================================================
       * MAIN LOCATION DOT
       * ========================================================
       */

      .lincoln-location-dot {
        position: absolute;

        width: 28px;
        height: 28px;

        left: 9px;
        top: 9px;

        border-radius: 50%;

        background: #2563eb;

        border: 3px solid #ffffff;

        box-shadow:
          0 2px 8px rgba(0, 0, 0, 0.45),
          0 0 0 1px rgba(0, 0, 0, 0.15);

        z-index: 3;
      }

      /*
       * ========================================================
       * INNER LOCATION DOT
       * ========================================================
       */

      .lincoln-location-dot-inner {
        position: absolute;

        width: 8px;
        height: 8px;

        left: 7px;
        top: 7px;

        border-radius: 50%;

        background: #ffffff;

        opacity: 0.95;
      }

      /*
       * ========================================================
       * HEADING CONTAINER
       * ========================================================
       */

      .lincoln-location-heading {
        position: absolute;

        width: 46px;
        height: 46px;

        left: 0;
        top: 0;

        transform-origin: center center;

        z-index: 5;

        transition:
          transform 0.25s ease,
          opacity 0.2s ease;
      }

      /*
       * ========================================================
       * DIRECTION ARROW
       * ========================================================
       */

      .lincoln-heading-arrow {
        position: absolute;

        left: 19px;
        top: -3px;

        width: 0;
        height: 0;

        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 12px solid #2563eb;

        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
      }

      /*
       * ========================================================
       * ACTIVE NAVIGATION MODE
       * ========================================================
       */

      .lincoln-navigation-active .lincoln-location-dot {
        box-shadow:
          0 2px 10px rgba(0, 0, 0, 0.5),
          0 0 0 2px rgba(37, 99, 235, 0.25);
      }

      .lincoln-navigation-active .lincoln-location-pulse {
        animation: lincolnNavigationPulse 1.8s infinite;
      }

      /*
       * ========================================================
       * NORMAL GPS PULSE
       * ========================================================
       */

      @keyframes lincolnLocationPulse {
        0% {
          transform: scale(0.85);
          opacity: 0.75;
        }

        70% {
          transform: scale(1.35);
          opacity: 0;
        }

        100% {
          transform: scale(1.35);
          opacity: 0;
        }
      }

      /*
       * ========================================================
       * NAVIGATION PULSE
       * ========================================================
       */

      @keyframes lincolnNavigationPulse {
        0% {
          transform: scale(0.9);
          opacity: 0.7;
        }

        65% {
          transform: scale(1.45);
          opacity: 0;
        }

        100% {
          transform: scale(1.45);
          opacity: 0;
        }
      }
    `}</style>
  )
}
