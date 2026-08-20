"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"

interface LocationMarkerProps {
  map: L.Map | null
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
  const markerRef = useRef<L.Marker | null>(null)
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

    elementRef.current = element

    const icon = L.divIcon({
      className: "lincoln-location-icon",
      html: element,
      iconSize: [46, 46],
      iconAnchor: [23, 23],
    })

    const marker = L.marker([0, 0], {
      icon,
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    })

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

    markerRef.current.setLatLng([
      latitude,
      longitude,
    ])
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

    const headingValue =
      typeof heading === "number" &&
      Number.isFinite(heading)
        ? heading
        : 0

    headingElement.style.transform =
      `rotate(${headingValue}deg)`
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
     * This is not a geographic Leaflet circle.
     * It is intentionally lightweight.
     */

    const size = Math.max(
      44,
      Math.min(safeAccuracy * 1.5, 130)
    )

    accuracyElement.style.width =
      `${size}px`

    accuracyElement.style.height =
      `${size}px`

    accuracyElement.style.left =
      `${(46 - size) / 2}px`

    accuracyElement.style.top =
      `${(46 - size) / 2}px`
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
       * LEAFLET LOCATION MARKER
       * ========================================================
       */

      .lincoln-location-icon {
        background: transparent !important;
        border: none !important;
        width: 46px !important;
        height: 46px !important;
      }

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

        background:
          rgba(37, 99, 235, 0.14);

        border:
          1px solid
          rgba(96, 165, 250, 0.32);

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

        background:
          rgba(37, 99, 235, 0.18);

        animation:
          lincolnLocationPulse
          2s
          infinite;

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

        background:
          #2563eb;

        border:
          3px solid
          #ffffff;

        box-shadow:
          0 2px 8px
          rgba(0, 0, 0, 0.45),

          0 0 0 1px
          rgba(0, 0, 0, 0.15);

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

        background:
          #ffffff;

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
          transform 0.25s ease;
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

        border-left:
          4px solid transparent;

        border-right:
          4px solid transparent;

        border-bottom:
          12px solid #2563eb;

        filter:
          drop-shadow(
            0 1px 2px
            rgba(0, 0, 0, 0.4)
          );
      }

      /*
       * ========================================================
       * ACTIVE NAVIGATION MODE
       * ========================================================
       */

      .lincoln-navigation-active
        .lincoln-location-dot {
        box-shadow:
          0 2px 10px
          rgba(0, 0, 0, 0.5),

          0 0 0 2px
          rgba(37, 99, 235, 0.25);
      }

      .lincoln-navigation-active
        .lincoln-location-pulse {
        animation:
          lincolnNavigationPulse
          1.8s
          infinite;
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