"use client"

import { X, Star, Home, Briefcase, Heart, Plus, MapPin } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

interface SavedPlace {
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
  onSelectPlace: (place: SavedPlace) => void
}

const ICONS = {
  home: Home,
  work: Briefcase,
  favorite: Heart,
}

// Sample saved places - in a real app, these would come from a database
const SAVED_PLACES: SavedPlace[] = [
  {
    id: "home",
    name: "Home",
    address: "Set your home address",
    lat: 5.6037,
    lng: -0.1870,
    icon: "home",
  },
  {
    id: "work",
    name: "Work",
    address: "Set your work address",
    lat: 5.5560,
    lng: -0.1969,
    icon: "work",
  },
]

const FAVORITES: SavedPlace[] = [
  {
    id: "fav1",
    name: "Accra Mall",
    address: "Spintex Road, Accra",
    lat: 5.6207,
    lng: -0.1174,
    icon: "favorite",
  },
  {
    id: "fav2",
    name: "Labadi Beach",
    address: "La, Accra",
    lat: 5.5567,
    lng: -0.1447,
    icon: "favorite",
  },
]

export function SavedPlacesPanel({ isOpen, onClose, onSelectPlace }: SavedPlacesPanelProps) {
  if (!isOpen) return null

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
        <div className="p-4">
          {/* Quick Access */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Quick Access
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {SAVED_PLACES.map((place) => {
                const Icon = ICONS[place.icon]
                return (
                  <button
                    key={place.id}
                    onClick={() => onSelectPlace(place)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{place.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                    </div>
                  </button>
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
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {FAVORITES.map((place) => {
                const Icon = ICONS[place.icon]
                return (
                  <button
                    key={place.id}
                    onClick={() => onSelectPlace(place)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-4 h-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{place.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{place.address}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Empty State */}
          {FAVORITES.length === 0 && (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No saved places yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Star places to save them here
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
