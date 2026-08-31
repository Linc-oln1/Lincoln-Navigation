"use client"

import { Search, Navigation, Layers, MapPin, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavProps {
  activePanel: "search" | "directions" | "places" | "saved" | null
  onSearchClick: () => void
  onDirectionsClick: () => void
  onPlacesClick: () => void
  onSavedClick: () => void
}

export function MobileNav({ activePanel, onSearchClick, onDirectionsClick, onPlacesClick, onSavedClick }: MobileNavProps) {
  const items = [
    { id: "search" as const, label: "Search", icon: Search, onClick: onSearchClick },
    { id: "directions" as const, label: "Directions", icon: Navigation, onClick: onDirectionsClick },
    { id: "places" as const, label: "Explore", icon: Layers, onClick: onPlacesClick },
    // PREVIOUSLY: this button did nothing (onClick: () => {}) —
    // SavedPlacesPanel existed as a component but was never
    // rendered anywhere in the app.
    { id: "saved" as const, label: "Saved", icon: Star, onClick: onSavedClick },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[1000] px-4 pb-4">
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl">
        <div className="flex items-center justify-around py-2">
          {items.map(({ id, label, icon: Icon, onClick }) => (
            <button
              key={id}
              onClick={onClick}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors min-w-[60px]",
                activePanel === id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-transform",
                activePanel === id && "scale-110"
              )} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
