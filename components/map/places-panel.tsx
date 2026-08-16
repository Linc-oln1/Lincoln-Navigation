"use client"

import { useState } from "react"
import { X, Utensils, ShoppingBag, Building2, Fuel, Hotel, Landmark, TreePine, GraduationCap, Loader2, MapPin } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Place {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type: string
}

interface PlacesPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlace: (place: Place) => void
  mapCenter: [number, number]
}

const CATEGORIES = [
  { id: "restaurant", label: "Restaurants", icon: Utensils },
  { id: "shop", label: "Shopping", icon: ShoppingBag },
  { id: "bank", label: "Banks", icon: Building2 },
  { id: "fuel", label: "Gas Stations", icon: Fuel },
  { id: "hotel", label: "Hotels", icon: Hotel },
  { id: "tourism", label: "Attractions", icon: Landmark },
  { id: "park", label: "Parks", icon: TreePine },
  { id: "university", label: "Universities", icon: GraduationCap },
]

export function PlacesPanel({ isOpen, onClose, onSelectPlace, mapCenter }: PlacesPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const searchNearbyPlaces = async (category: string) => {
    setSelectedCategory(category)
    setIsLoading(true)
    setPlaces([])

    try {
      // Search for places near the map center using Overpass API
      const radius = 10000 // 10km radius
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="${category}"](around:${radius},${mapCenter[0]},${mapCenter[1]});
          node["tourism"="${category}"](around:${radius},${mapCenter[0]},${mapCenter[1]});
          node["shop"="${category}"](around:${radius},${mapCenter[0]},${mapCenter[1]});
        );
        out body 20;
      `

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      })
      const data = await response.json()

      if (data.elements) {
        const foundPlaces: Place[] = data.elements.map((element: any, index: number) => ({
          id: `place-${index}`,
          name: element.tags?.name || `${category.charAt(0).toUpperCase() + category.slice(1)}`,
          address: element.tags?.["addr:street"] 
            ? `${element.tags["addr:street"]}${element.tags["addr:city"] ? `, ${element.tags["addr:city"]}` : ""}`
            : "Ghana",
          lat: element.lat,
          lng: element.lon,
          type: category,
        }))
        setPlaces(foundPlaces)
      }
    } catch (error) {
      console.log("[v0] Places search error:", error)
      // Fallback with sample data
      setPlaces([
        {
          id: "1",
          name: `Sample ${selectedCategory}`,
          address: "Near your location",
          lat: mapCenter[0] + 0.01,
          lng: mapCenter[1] + 0.01,
          type: category,
        },
      ])
    }

    setIsLoading(false)
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
                onClick={() => searchNearbyPlaces(id)}
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
              <p className="text-muted-foreground">No places found in this area</p>
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
                    {CATEGORIES.find((c) => c.id === place.type)?.icon && (
                      (() => {
                        const IconComponent = CATEGORIES.find((c) => c.id === place.type)!.icon
                        return <IconComponent className="w-5 h-5 text-primary" />
                      })()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{place.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{place.address}</p>
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
