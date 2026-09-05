"use client"

import { X, Star, Home, Briefcase, Heart, Pencil } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SavedPlaceEntry } from "@/hooks/use-saved-places"

interface SelectablePlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  icon: "home" | "work" | "favorite"
}

interface SavedPlacesPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlace: (place: SelectablePlace) => void
  favorites: SavedPlaceEntry[]
  home: SavedPlaceEntry | null
  work: SavedPlaceEntry | null
  onRemoveFavorite: (id: string) => void
  onRequestSetHomeWork: (target: "home" | "work") => void
}

/**
 * Home/Work/Favorites, all real and specific to this browser (see
 * use-saved-places.ts) — replaces the previous hardcoded sample
 * data (fake "Home"/"Work" pins at fixed coordinates, and a
 * Labadi Beach/Accra Mall favorites list shown to every visitor,
 * with an "Add" button and empty state that never actually did
 * anything).
 */
export function SavedPlacesPanel({
  isOpen,
  onClose,
  onSelectPlace,
  favorites,
  home,
  work,
  onRemoveFavorite,
  onRequestSetHomeWork,
}: SavedPlacesPanelProps) {
  if (!isOpen) return null

  const quickAccess: { target: "home" | "work"; place: SavedPlaceEntry | null }[] = [
    { target: "home", place: home },
    { target: "work", place: work },
  ]

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-[400px] bg-card/95 backdrop-blur-xl z-[1001] border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved Places</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* contain: inline-size stops Radix's Viewport (which sizes
            itself like a table cell, shrink-to-fit) from stretching
            to match this row's un-wrapped `truncate` text — without
            it, a long address forces the whole panel wider than the
            screen and clips Work/remove buttons off the right edge
            on narrow viewports. */}
        <div className="p-4" style={{ contain: "inline-size" }}>
          {/* Quick Access */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Quick Access
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickAccess.map(({ target, place }) => {
                const Icon = target === "home" ? Home : Briefcase
                const label = target === "home" ? "Home" : "Work"
                return (
                  <div key={target} className="relative">
                    <button
                      onClick={() =>
                        place
                          ? onSelectPlace({ ...place, icon: target })
                          : onRequestSetHomeWork(target)
                      }
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 pr-5">
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {place ? place.address : `Set your ${label.toLowerCase()} address`}
                        </p>
                      </div>
                    </button>
                    {/* Always visible (not hover-only) so it's reachable
                        on touch devices, which have no hover state. */}
                    {place && (
                      <button
                        onClick={() => onRequestSetHomeWork(target)}
                        aria-label={`Change ${label.toLowerCase()} address`}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-card/80 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-card transition-opacity"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Favorites */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Star className="w-3 h-3" />
                Favorites
              </h3>
            </div>
            {favorites.length > 0 ? (
              <div className="space-y-2">
                {favorites.map((place) => (
                  <div key={place.id} className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectPlace({ ...place, icon: "favorite" })}
                      className="flex-1 min-w-0 flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                        <Heart className="w-4 h-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{place.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{place.address}</p>
                      </div>
                    </button>
                    {/* Always visible (not hover-only) so it's reachable
                        on touch devices, which have no hover state. */}
                    <button
                      onClick={() => onRemoveFavorite(place.id)}
                      aria-label={`Remove ${place.name} from favorites`}
                      className="p-2 rounded-lg text-muted-foreground opacity-70 hover:opacity-100 hover:bg-secondary hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No saved places yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tap the star icon on any place to save it here
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
