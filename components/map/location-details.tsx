"use client"

import { X, Navigation, Share2, Star, MapPin, Phone, Globe, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LocationDetailsProps {
  location: {
    name: string
    address: string
    lat: number
    lng: number
    type?: string
  } | null
  isFavorite?: boolean
  onToggleFavorite?: () => void
  onClose: () => void
  onGetDirections: () => void
}

export function LocationDetails({
  location,
  isFavorite = false,
  onToggleFavorite,
  onClose,
  onGetDirections,
}: LocationDetailsProps) {
  if (!location) return null

  const handleShare = async () => {
    const url = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: location.name,
          text: `Check out ${location.name}`,
          url: url,
        })
      } catch (error) {
        console.log("[v0] Share cancelled or failed")
      }
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-[380px] bg-card/95 backdrop-blur-xl z-[1001] border border-border rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{location.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
            {location.type && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full capitalize">
                {location.type}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-3">
          <Button 
            onClick={onGetDirections}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Directions
          </Button>
          <Button
            variant="secondary"
            onClick={handleShare}
            className="px-4"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
            className="px-4"
          >
            <Star className={cn("w-4 h-4", isFavorite && "fill-current text-primary")} />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-foreground">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
        </div>
      </div>

      {/* Quick info */}
      <div className="px-4 pb-4">
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">
            Tap &quot;Directions&quot; to navigate to this location. You can also share this place with others.
          </p>
        </div>
      </div>
    </div>
  )
}
