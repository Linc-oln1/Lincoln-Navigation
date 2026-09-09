"use client"

import { useEffect, useRef } from "react"
import * as maplibregl from "maplibre-gl"

import { hazardKindMeta, type Hazard } from "@/lib/hazards"

/* Renders community hazard reports as tappable markers on the
   MapLibre map. Same map-prop pattern as LocationMarker /
   NavigationCamera — the map instance lives in map-view.tsx and is
   passed down. */

interface HazardLayerProps {
  map: maplibregl.Map | null
  hazards: Hazard[]
  selectedId?: string | null
  onSelect: (hazard: Hazard) => void
}

function buildMarkerElement(hazard: Hazard, selected: boolean): HTMLDivElement {
  const meta = hazardKindMeta(hazard.kind)
  const el = document.createElement("div")
  el.className = "lincoln-hazard-marker"
  el.style.cssText = `
    width: 34px; height: 34px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; line-height: 1;
    border-radius: 9999px;
    background: ${meta.color};
    border: 2px solid rgba(255,255,255,0.9);
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    transform: ${selected ? "scale(1.18)" : "scale(1)"};
    transition: transform 120ms ease;
    ${hazard.source !== "crowd_report" ? "opacity: 0.9; border-style: dashed;" : ""}
  `
  el.textContent = meta.emoji
  el.setAttribute("role", "button")
  el.setAttribute(
    "aria-label",
    `${meta.label}${hazard.source === "crowd_report" ? " reported by a driver" : " — known area"}`
  )

  // A soft pulse for the more serious, still-unconfirmed reports.
  if (hazard.source === "crowd_report" && hazard.severity >= 0.6) {
    const pulse = document.createElement("span")
    pulse.style.cssText = `
      position: absolute; inset: -6px; border-radius: 9999px;
      border: 2px solid ${meta.color};
      animation: lincoln-hazard-pulse 2s ease-out infinite;
      pointer-events: none;
    `
    el.style.position = "relative"
    el.appendChild(pulse)
  }

  return el
}

// Inject the keyframes once.
let keyframesInjected = false
function ensureKeyframes() {
  if (keyframesInjected || typeof document === "undefined") return
  const style = document.createElement("style")
  style.textContent = `
    @keyframes lincoln-hazard-pulse {
      0% { transform: scale(0.85); opacity: 0.7; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  `
  document.head.appendChild(style)
  keyframesInjected = true
}

export function HazardLayer({
  map,
  hazards,
  selectedId,
  onSelect,
}: HazardLayerProps) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  // Keep the latest onSelect without re-running the whole diff effect.
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    ensureKeyframes()
  }, [])

  useEffect(() => {
    if (!map) return

    const existing = markersRef.current
    const nextIds = new Set(hazards.map((h) => h.id))

    // Remove markers for hazards that are gone.
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.remove()
        existing.delete(id)
      }
    }

    // Add / update the rest.
    for (const hazard of hazards) {
      const selected = hazard.id === selectedId
      const prev = existing.get(hazard.id)
      if (prev) {
        // Cheap update: just restyle for selection state.
        const el = prev.getElement()
        el.style.transform = selected ? "scale(1.18)" : "scale(1)"
        prev.setLngLat([hazard.location.lng, hazard.location.lat])
        continue
      }

      const el = buildMarkerElement(hazard, selected)
      el.addEventListener("click", (e) => {
        e.stopPropagation()
        onSelectRef.current(hazard)
      })

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([hazard.location.lng, hazard.location.lat])
        .addTo(map)

      existing.set(hazard.id, marker)
    }
  }, [map, hazards, selectedId])

  // Tear everything down on unmount.
  useEffect(() => {
    const markers = markersRef.current
    return () => {
      for (const marker of markers.values()) marker.remove()
      markers.clear()
    }
  }, [])

  return null
}
