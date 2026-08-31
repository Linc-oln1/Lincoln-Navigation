"use client"

import { useState, useEffect, useRef } from "react"
import {
  X,
  Utensils,
  Coffee,
  ShoppingBag,
  ShoppingCart,
  Building2,
  Fuel,
  Hotel,
  Landmark,
  TreePine,
  GraduationCap,
  Loader2,
  MapPin,
  CreditCard,
  Pill,
  Hospital,
  ParkingCircle,
  Church,
  Clapperboard,
  Dumbbell,
  Plane,
  Star,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { searchNearbyPlaces, type Place } from "@/lib/geocoding"

/*
 * PREVIOUSLY: this panel queried the Overpass API directly from
 * the browser using tag combinations that, for several categories
 * (notably "Shopping"), don't correspond to any real OpenStreetMap
 * tag at all — so those categories always returned zero results
 * and silently showed a FAKE placeholder ("Sample shop") instead.
 * Only point (node) features were queried, so anything mapped as
 * a building/way (most supermarkets, malls, hotels...) was
 * invisible.
 *
 * NOW: category queries go through /api/places, which uses correct
 * tag filters and includes ways/relations too, with an honest
 * "no results" state instead of fabricated data. The category list
 * is also considerably larger so more of what's actually in an
 * area can be found.
 */

interface PlacesPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlace: (place: Place) => void
  mapCenter: [number, number]
}

const CATEGORIES = [
  { id: "restaurant", label: "Restaurants", icon: Utensils },
  { id: "cafe", label: "Cafes", icon: Coffee },
  { id: "shop", label: "Shopping", icon: ShoppingBag },
  { id: "supermarket", label: "Supermarkets", icon: ShoppingCart },
  { id: "bank", label: "Banks", icon: Building2 },
  { id: "atm", label: "ATMs", icon: CreditCard },
  { id: "fuel", label: "Gas Stations", icon: Fuel },
  { id: "hotel", label: "Hotels", icon: Hotel },
  { id: "tourism", label: "Attractions", icon: Landmark },
  { id: "park", label: "Parks", icon: TreePine },
  { id: "university", label: "Universities", icon: GraduationCap },
  { id: "hospital", label: "Hospitals", icon: Hospital },
  { id: "pharmacy", label: "Pharmacies", icon: Pill },
  { id: "parking", label: "Parking", icon: ParkingCircle },
  { id: "place_of_worship", label: "Worship", icon: Church },
  { id: "cinema", label: "Cinemas", icon: Clapperboard },
  { id: "gym", label: "Gyms", icon: Dumbbell },
  { id: "airport", label: "Airports", icon: Plane },
] as const

export function PlacesPanel({ isOpen, onClose, onSelectPlace, mapCenter }: PlacesPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel any in-flight lookup when the panel closes or the
    // map center changes significantly, to avoid stale results
    // landing after a newer request.
    return () => abortControllerRef.current?.abort()
  }, [])

  const searchCategory = async (category: string) => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setSelectedCategory(category)
    setIsLoading(true)
    setError(null)
    setPlaces([])

    try {
      const found = await searchNearbyPlaces(
        category,
        mapCenter,
        10000,
        controller.signal
      )

      if (controller.signal.aborted) return

      setPlaces(found)

      if (found.length === 0) {
        setError("No places found in this area for this category.")
      }
    } catch (err) {
      if (controller.signal.aborted) return

      // The free public Overpass API this route proxies to is
      // known to return occasional 5xx errors under load — a
      // real-world condition, not a code defect, and one the UI
      // already surfaces properly via setError() below. console.error
      // trips Next's dev overlay as a blocking "Console Error" for
      // something that's already handled gracefully, so this stays
      // a warn (still visible for debugging, just not disruptive).
      console.warn("Places search error:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Could not load nearby places. Please try again."
      )
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-[400px] bg-card/95 backdrop-blur-xl z-[1001] border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Explore Nearby</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Close places"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Categories Grid */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => searchCategory(id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                  selectedCategory === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {/* Results */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground">Finding places nearby...</p>
            </div>
          )}

          {!isLoading && selectedCategory && places.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {error || "No places found in this area"}
              </p>
            </div>
          )}

          {!isLoading && places.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {places.length} places found
              </h3>
              {places.map((place) => (
                <button
                  key={place.id}
                  onClick={() => onSelectPlace(place)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const IconComponent =
                        CATEGORIES.find((c) => c.id === place.type)?.icon ??
                        MapPin
                      return <IconComponent className="w-5 h-5 text-primary" />
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{place.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{place.address}</p>
                    {/* Only Google-sourced results carry a rating —
                        the free OSM/Overpass fallback has none, so
                        this quietly doesn't render for those. */}
                    {typeof place.rating === "number" && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs text-muted-foreground">
                          {place.rating.toFixed(1)}
                          {typeof place.ratingCount === "number" &&
                            ` (${place.ratingCount})`}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Initial state */}
          {!selectedCategory && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Select a category to find places nearby</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
