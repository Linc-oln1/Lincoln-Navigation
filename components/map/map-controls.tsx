"use client"

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
  return (
    <div className="absolute top-20 right-4 z-[1000]">
      <div className="bg-card/90 backdrop-blur-sm rounded-xl border border-border shadow-lg overflow-hidden">

        {STYLES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onStyleChange(id)}
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
    </div>
  )
}