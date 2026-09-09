"use client"

import { useState } from "react"
import { ChevronDown, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { alongRouteLabel, type OnRouteHazard } from "@/lib/hazard-geometry"
import { hazardKindMeta, relativeTime, type Hazard } from "@/lib/hazards"

interface RouteHazardWarningProps {
  items: OnRouteHazard[]
  /** Tapping a row asks the app to highlight that hazard on the map. */
  onFocus?: (hazard: Hazard) => void
}

export function RouteHazardWarning({ items, onFocus }: RouteHazardWarningProps) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  const severe = items.some(
    ({ hazard }) => hazard.kind === "closure" || hazard.severity >= 0.7
  )

  return (
    <div
      className={cn(
        "mb-4 rounded-xl border overflow-hidden",
        severe
          ? "border-destructive/40 bg-destructive/10"
          : "border-amber-500/40 bg-amber-500/10"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-3 text-left"
      >
        <TriangleAlert
          className={cn(
            "w-4 h-4 shrink-0",
            severe ? "text-destructive" : "text-amber-600"
          )}
        />
        <span className="text-sm font-medium flex-1">
          {items.length} hazard{items.length === 1 ? "" : "s"} on this route
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <ul className="border-t border-border/50 divide-y divide-border/50">
          {items.map(({ hazard, metresAlongRoute }) => {
            const meta = hazardKindMeta(hazard.kind)
            return (
              <li key={hazard.id}>
                <button
                  type="button"
                  onClick={() => onFocus?.(hazard)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="text-base leading-none" aria-hidden>
                    {meta.emoji}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {meta.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {hazard.source === "crowd_report"
                        ? `reported ${relativeTime(hazard.createdAt)}`
                        : "known area"}
                      {" · "}
                      {alongRouteLabel(metresAlongRoute)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
