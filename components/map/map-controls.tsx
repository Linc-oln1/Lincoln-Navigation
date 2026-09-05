"use client"

import { useEffect, useRef, useState } from "react"
import {
  Map,
  Satellite,
  Mountain,
  Sun,
  Moon,
  Monitor,
} from "lucide-react"

import { cn } from "@/lib/utils"

type MapStyle =
  | "light"
  | "dark"
  | "device"
  | "satellite"
  | "terrain"

interface MapControlsProps {
  currentStyle: MapStyle
  onStyleChange: (style: MapStyle) => void
}

const STYLES = [
  {
    id: "light" as const,
    label: "Light",
    icon: Sun,
  },
  {
    id: "dark" as const,
    label: "Dark",
    icon: Moon,
  },
  {
    id: "device" as const,
    label: "Device",
    icon: Monitor,
  },
  {
    id: "satellite" as const,
    label: "Satellite",
    icon: Satellite,
  },
  {
    id: "terrain" as const,
    label: "Terrain",
    icon: Mountain,
  },
]

export function MapControls({
  currentStyle,
  onStyleChange,
}: MapControlsProps) {
  // This used to render the full style list permanently — no toggle
  // button existed anywhere to hide it, so it sat over the map on
  // every load, on every device, for every visitor (worst on small
  // mobile screens, where it ate a real chunk of the map). The `Map`
  // icon above was already imported for exactly this button and
  // never actually used.
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [isOpen])

  return (
    <div ref={containerRef} className="absolute top-20 right-4 z-[1000]">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Hide map style options" : "Change map style"}
        aria-expanded={isOpen}
        className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-sm border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
      >
        <Map className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="mt-2 bg-card/90 backdrop-blur-sm rounded-xl border border-border shadow-lg overflow-hidden">
          {STYLES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                onStyleChange(id)
                setIsOpen(false)
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 w-full transition-colors",
                currentStyle === id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />

              <span className="text-sm font-medium">
                {label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}