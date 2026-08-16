"use client"

import { useState, useEffect } from "react"
import { X, Navigation, Car, Footprints, Bike, Clock, MapPin, ArrowRight, Loader2, LocateFixed } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Location {
  name: string
  lat: number
  lng: number
}

interface DirectionsPanelProps {
  isOpen: boolean
  onClose: () => void
  initialDestination?: Location | null
  onRouteCalculated: (points: [number, number][]) => void
}

type TravelMode = "driving" | "walking" | "cycling"

interface RouteInfo {
  distance: string
  duration: string
  steps: Array<{
    instruction: string
    distance: string
  }>
}

export function DirectionsPanel({ isOpen, onClose, initialDestination, onRouteCalculated }: DirectionsPanelProps) {
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [travelMode, setTravelMode] = useState<TravelMode>("driving")
  const [isLoading, setIsLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialDestination) {
      setDestination(initialDestination.name)
    }
  }, [initialDestination])

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            )
            const data = await response.json()
            setOrigin(data.display_name?.split(",").slice(0, 2).join(",") || "Current Location")
          } catch {
            setOrigin("Current Location")
          }
        },
        () => {
          setError("Unable to get your location")
        }
      )
    }
  }

  const calculateRoute = async () => {
    if (!origin || !destination) {
      setError("Please enter both origin and destination")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Geocode origin
      const originRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origin)}&countrycodes=gh&limit=1`
      )
      const originData = await originRes.json()

      // Geocode destination
      const destRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&countrycodes=gh&limit=1`
      )
      const destData = await destRes.json()

      if (!originData[0] || !destData[0]) {
        setError("Could not find one or both locations")
        setIsLoading(false)
        return
      }

      const originCoords: [number, number] = [parseFloat(originData[0].lat), parseFloat(originData[0].lon)]
      const destCoords: [number, number] = [parseFloat(destData[0].lat), parseFloat(destData[0].lon)]

      // Get route from OSRM
      const profile = travelMode === "driving" ? "driving" : travelMode === "cycling" ? "cycling" : "foot"
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson&steps=true`
      )
      const routeData = await routeRes.json()

      if (routeData.code === "Ok" && routeData.routes[0]) {
        const route = routeData.routes[0]
        const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
        
        onRouteCalculated(coordinates)

        // Format duration
        const durationMinutes = Math.round(route.duration / 60)
        const durationHours = Math.floor(durationMinutes / 60)
        const durationFormatted = durationHours > 0 
          ? `${durationHours} hr ${durationMinutes % 60} min`
          : `${durationMinutes} min`

        // Format distance
        const distanceKm = (route.distance / 1000).toFixed(1)

        // Get steps from first leg
        const steps = route.legs[0]?.steps?.map((step: any) => ({
          instruction: step.maneuver.instruction || `Continue on ${step.name || "road"}`,
          distance: step.distance > 1000 
            ? `${(step.distance / 1000).toFixed(1)} km`
            : `${Math.round(step.distance)} m`,
        })) || []

        setRouteInfo({
          distance: `${distanceKm} km`,
          duration: durationFormatted,
          steps: steps.slice(0, 10), // Limit to 10 steps
        })
      } else {
        setError("Could not calculate route. Try different locations.")
      }
    } catch (err) {
      console.log("[v0] Route calculation error:", err)
      setError("Error calculating route. Please try again.")
    }

    setIsLoading(false)
  }

  const swapLocations = () => {
    const temp = origin
    setOrigin(destination)
    setDestination(temp)
  }

  if (!isOpen) return null

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-[400px] bg-card/95 backdrop-blur-xl z-[1001] border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Directions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Close directions"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Travel Mode */}
        <div className="flex gap-2 mb-4">
          {[
            { mode: "driving" as const, icon: Car, label: "Drive" },
            { mode: "walking" as const, icon: Footprints, label: "Walk" },
            { mode: "cycling" as const, icon: Bike, label: "Bike" },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setTravelMode(mode)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors",
                travelMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Origin & Destination */}
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
            <Input
              placeholder="Starting point"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="pl-8 pr-10 bg-secondary border-0"
            />
            <button
              onClick={handleUseCurrentLocation}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              title="Use current location"
            >
              <LocateFixed className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <button
              onClick={swapLocations}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              title="Swap locations"
            >
              <ArrowRight className="w-4 h-4 rotate-90" />
            </button>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
            <Input
              placeholder="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-8 bg-secondary border-0"
            />
          </div>

          <Button 
            onClick={calculateRoute} 
            className="w-full bg-primary hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      </div>

      {/* Route Info */}
      {routeInfo && (
        <ScrollArea className="flex-1">
          <div className="p-4">
            {/* Summary */}
            <div className="bg-secondary rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{routeInfo.duration}</p>
                  <p className="text-muted-foreground">{routeInfo.distance}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  {travelMode === "driving" ? (
                    <Car className="w-6 h-6 text-primary" />
                  ) : travelMode === "walking" ? (
                    <Footprints className="w-6 h-6 text-primary" />
                  ) : (
                    <Bike className="w-6 h-6 text-primary" />
                  )}
                </div>
              </div>
            </div>

            {/* Steps */}
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Turn-by-turn
            </h3>
            <div className="space-y-2">
              {routeInfo.steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{step.instruction}</p>
                    <p className="text-xs text-muted-foreground">{step.distance}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
