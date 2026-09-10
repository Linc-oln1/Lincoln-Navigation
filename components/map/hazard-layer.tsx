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

// MapLibre owns the transform on the element it's given (it writes
// the translate() that positions the marker), so the visible dot —
// and its selection scale — live on an inner child instead.
function buildMarkerElement(hazard: Hazard, selected: boolean): HTMLDivElement {
  const meta = hazardKindMeta(hazard.kind)

  const el = document.createElement("div")
  el.className = "lincoln-hazard-marker"
  el.style.cssText = "position: relative; width: 34px; height: 34px; cursor: pointer;"
  el.setAttribute("role", "button")
  el.setAttribute(
    "aria-label",
    `${meta.label}${
      hazard.source === "crowd_report"
        ? " reported by a driver"
        : hazard.source === "forecast"
          ? " — heavy rain forecast"
          : " — known area"
    }`
  )

  const dot = document.createElement("div")
  dot.className = "lincoln-hazard-dot"
  dot.style.cssText = `
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; line-height: 1;
    border-radius: 9999px;
    background: ${meta.color};
    border: 2px solid rgba(255,255,255,0.9);
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    transform: scale(${selected ? 1.18 : 1});
    transition: transform 120ms ease;
    ${hazard.source !== "crowd_report" ? "opacity: 0.9; border-style: dashed;" : ""}
  `
  dot.textContent = meta.emoji
  el.appendChild(dot)

  // A soft pulse for the more serious live signals — a fresh
  // report, or a flood zone under a heavy-rain forecast.
  if (
    (hazard.source === "crowd_report" || hazard.source === "forecast") &&
    hazard.severity >= 0.6
  ) {
    const pulse = document.createElement("span")
    pulse.style.cssText = `
      position: absolute; inset: -6px; border-radius: 9999px;
      border: 2px solid ${meta.color};
      animation: lincoln-hazard-pulse 2s ease-out infinite;
      pointer-events: none;
    `
    el.appendChild(pulse)
  }

  return el
}

// Everything buildMarkerElement renders off the hazard (colour, emoji,
// dashed border, aria label, pulse) except the selection scale, which
// is restyled in place. When this string changes the marker element is
// rebuilt; otherwise the update is a cheap restyle + reposition.
function visualSignature(hazard: Hazard): string {
  const pulses =
    (hazard.source === "crowd_report" || hazard.source === "forecast") &&
    hazard.severity >= 0.6
  return `${hazard.kind}|${hazard.source}|${pulses ? "1" : "0"}`
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
  const markersRef = useRef<
    Map<string, { marker: maplibregl.Marker; sig: string }>
  >(new Map())
  // Keep the latest onSelect without re-running the whole diff effect.
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // Latest hazard object per id, so a marker's click handler always
  // hands back current data (vote counts, note, severity) even when
  // the marker element itself wasn't rebuilt.
  const hazardsByIdRef = useRef<Map<string, Hazard>>(new Map())
  hazardsByIdRef.current = new Map(hazards.map((h) => [h.id, h]))

  useEffect(() => {
    ensureKeyframes()
  }, [])

  useEffect(() => {
    if (!map) return

    const existing = markersRef.current
    const nextIds = new Set(hazards.map((h) => h.id))

    // Remove markers for hazards that are gone.
    for (const [id, entry] of existing) {
      if (!nextIds.has(id)) {
        entry.marker.remove()
        existing.delete(id)
      }
    }

    const addMarker = (hazard: Hazard, selected: boolean) => {
      const el = buildMarkerElement(hazard, selected)
      el.addEventListener("click", (e) => {
        e.stopPropagation()
        // Read the current hazard object, not the one captured here.
        onSelectRef.current(hazardsByIdRef.current.get(hazard.id) ?? hazard)
      })

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([hazard.location.lng, hazard.location.lat])
        .addTo(map)

      existing.set(hazard.id, { marker, sig: visualSignature(hazard) })
    }

    // Add / update the rest.
    for (const hazard of hazards) {
      const selected = hazard.id === selectedId
      const prev = existing.get(hazard.id)

      if (!prev) {
        addMarker(hazard, selected)
        continue
      }

      // A changed emoji / colour / source / pulse means the element
      // has to be rebuilt (and its stale click closure with it).
      if (prev.sig !== visualSignature(hazard)) {
        prev.marker.remove()
        existing.delete(hazard.id)
        addMarker(hazard, selected)
        continue
      }

      // Cheap update: restyle selection state, reposition.
      const dot = prev.marker
        .getElement()
        .querySelector<HTMLElement>(".lincoln-hazard-dot")
      if (dot) dot.style.transform = selected ? "scale(1.18)" : "scale(1)"
      prev.marker.setLngLat([hazard.location.lng, hazard.location.lat])
    }
  }, [map, hazards, selectedId])

  // Tear everything down on unmount.
  useEffect(() => {
    const markers = markersRef.current
    return () => {
      for (const { marker } of markers.values()) marker.remove()
      markers.clear()
    }
  }, [])

  return null
}
