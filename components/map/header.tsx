"use client"

import { Search, Navigation, MapPin, Menu, Compass, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  onSearchClick: () => void
  onDirectionsClick: () => void
  onPlacesClick: () => void
  activePanel: "search" | "directions" | "places" | "saved" | null
}

export function Header({ onSearchClick, onDirectionsClick, onPlacesClick, activePanel }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-[1000] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo & Search Bar */}
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-3">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Compass className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground hidden sm:block">Lincoln</span>
            </div>

            {/* Search Button */}
            <button
              onClick={onSearchClick}
              className={cn(
                "flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-left",
                activePanel === "search"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
              )}
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search anywhere...</span>
            </button>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={onDirectionsClick}
                className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  activePanel === "directions"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground"
                )}
                title="Get directions"
              >
                <Navigation className="w-5 h-5" />
              </button>
              <button
                onClick={onPlacesClick}
                className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  activePanel === "places"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground"
                )}
                title="Explore places"
              >
                <Layers className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
