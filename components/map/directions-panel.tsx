"use client"

import { useEffect, useState } from "react"

import {
  X,
  Navigation,
  Car,
  Footprints,
  Bike,
  Bus,
  Motorbike,
  ArrowRight,
  Loader2,
  LocateFixed,
  Volume2,
  VolumeX,
  Square,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { useLiveNavigation } from "@/hooks/use-live-navigation"
import {
  calculateRoute,
  formatDistance as formatRouteDistance,
  formatDuration as formatRouteDuration,
  type Coordinate,
} from "@/lib/routing"
import {
  geocodeToCoordinates,
  reverseGeocode,
} from "@/lib/geocoding"

/*
 * PREVIOUSLY: this file contained ~700 lines of its own Mapbox
 * geocoding + directions client (duplicating lib/routing.ts),
 * required NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN (never set anywhere in
 * the project, so every route calculation failed immediately with
 * "Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"), and hard-rejected any
 * geocoded result outside a Ghana bounding box.
 *
 * NOW: it uses the shared, free/keyless lib/routing.ts (OSRM) and
 * lib/geocoding.ts (Nominatim proxy + Ghana fast-path table), so
 * directions actually work, anywhere.
 */

/* =========================================================
   TYPES
========================================================= */

interface Location {
  name: string
  lat: number
  lng: number
}

interface NavigationUpdate {
  isNavigating: boolean
  latitude: number | null
  longitude: number | null
  heading: number | null
  accuracy: number | null
}

interface DirectionsPanelProps {
  isOpen: boolean
  onClose: () => void
  initialDestination?: Location | null
  // Lets a caller (e.g. the marketing landing page's "Plan a route"
  // widget, which navigates here with ?mode=... in the URL) preset
  // the transport mode before the user touches anything.
  initialTravelMode?: TravelMode
  onRouteCalculated: (points: [number, number][]) => void
  onNavigationStateChange?: (state: NavigationUpdate) => void
}

export type TravelMode =
  | "driving"
  | "motorcycle"
  | "bus"
  | "walking"
  | "cycling"

const TRAVEL_MODES: {
  mode: TravelMode
  icon: typeof Car
  label: string
}[] = [
  { mode: "driving", icon: Car, label: "Drive" },
  { mode: "motorcycle", icon: Motorbike, label: "Motorcycle" },
  { mode: "bus", icon: Bus, label: "Bus" },
  { mode: "walking", icon: Footprints, label: "Walk" },
  { mode: "cycling", icon: Bike, label: "Bike" },
]

interface RouteStepView {
  instruction: string
  distance: string
  duration: string
  voiceInstruction?: string
}

interface RouteInfo {
  distance: string
  duration: string
  steps: RouteStepView[]
}

/* =========================================================
   DIRECTIONS PANEL
========================================================= */

export function DirectionsPanel({
  isOpen,
  onClose,
  initialDestination,
  initialTravelMode,
  onRouteCalculated,
  onNavigationStateChange,
}: DirectionsPanelProps) {
  /* -------------------------------------------------------
     LOCATION STATE

     Coordinates here follow lib/routing.ts's convention:
     [longitude, latitude].
  ------------------------------------------------------- */

  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")

  const [originCoordinates, setOriginCoordinates] =
    useState<Coordinate | null>(null)

  const [destinationCoordinates, setDestinationCoordinates] =
    useState<Coordinate | null>(null)

  /* -------------------------------------------------------
     ROUTE STATE
  ------------------------------------------------------- */

  const [travelMode, setTravelMode] = useState<TravelMode>("driving")
  const [isLoading, setIsLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* -------------------------------------------------------
     VOICE
  ------------------------------------------------------- */

  const [voiceEnabled, setVoiceEnabled] = useState(true)

  /* -------------------------------------------------------
     LIVE NAVIGATION
  ------------------------------------------------------- */

  const [isLiveNavigation, setIsLiveNavigation] = useState(false)

  const [liveSteps, setLiveSteps] = useState<
    {
      instruction: string
      voiceInstruction?: string
      coordinates: [number, number][]
    }[]
  >([])

  const [liveDestination, setLiveDestination] =
    useState<[number, number] | null>(null)

  const {
    isNavigating,
    position,
    currentStepIndex,
    distanceToDestination,
    etaSeconds,
    arrivalTime,
    navigationMessage,
    gpsError,
    startNavigation,
    stopNavigation,
  } = useLiveNavigation({
    steps: liveSteps,
    destination: liveDestination,
    enabled: isLiveNavigation,
    travelMode,
  })

  /* =======================================================
     BUBBLE LIVE POSITION UP TO THE MAP
  ======================================================= */

  useEffect(() => {
    onNavigationStateChange?.({
      isNavigating,
      latitude: position?.latitude ?? null,
      longitude: position?.longitude ?? null,
      heading: position?.heading ?? null,
      accuracy: position?.accuracy ?? null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating, position])

  /* =======================================================
     INITIAL DESTINATION
  ======================================================= */

  useEffect(() => {
    if (!initialDestination) return

    setDestination(initialDestination.name)
    setDestinationCoordinates([
      initialDestination.lng,
      initialDestination.lat,
    ])
    setRouteInfo(null)
    setError(null)
  }, [initialDestination])

  /* =======================================================
     INITIAL TRAVEL MODE
  ======================================================= */

  useEffect(() => {
    if (!initialTravelMode) return
    setTravelMode(initialTravelMode)
  }, [initialTravelMode])

  /* =======================================================
     CLOSE NAVIGATION WHEN PANEL CLOSES
  ======================================================= */

  useEffect(() => {
    if (!isOpen) {
      stopNavigation()
      setIsLiveNavigation(false)
    }
  }, [isOpen, stopNavigation])

  /* =======================================================
     VOICE
  ======================================================= */

  const speak = (text: string) => {
    if (!voiceEnabled) return
    if (typeof window === "undefined") return
    if (!("speechSynthesis" in window)) return
    if (!text.trim()) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-US"
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1

    window.speechSynthesis.speak(utterance)
  }

  /* =======================================================
     CURRENT GPS LOCATION
  ======================================================= */

  const handleUseCurrentLocation = () => {
    setError(null)

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location services are not available on this device.")
      return
    }

    setOrigin("Finding your location...")

    navigator.geolocation.getCurrentPosition(
      async (currentPosition) => {
        const { latitude, longitude } = currentPosition.coords

        setOriginCoordinates([longitude, latitude])

        try {
          const place = await reverseGeocode(latitude, longitude)
          setOrigin(place?.address || "Current Location")
        } catch {
          setOrigin("Current Location")
        }
      },
      () => {
        setOrigin("")
        setOriginCoordinates(null)
        setError(
          "Unable to get your current location. Please allow location access."
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  /* =======================================================
     CALCULATE ROUTE
  ======================================================= */

  const handleCalculateRoute = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError("Please enter both your starting point and destination.")
      return
    }

    stopNavigation()
    setIsLiveNavigation(false)

    setIsLoading(true)
    setError(null)
    setRouteInfo(null)

    try {
      const originCoords =
        originCoordinates ||
        (await geocodeToCoordinates(origin).then(
          (result) => result && ([result[1], result[0]] as Coordinate)
        ))

      const destinationCoords =
        destinationCoordinates ||
        (await geocodeToCoordinates(destination).then(
          (result) => result && ([result[1], result[0]] as Coordinate)
        ))

      if (!originCoords) {
        throw new Error(
          `Could not find "${origin}". Try a more specific location, such as "Kwabenya, Accra".`
        )
      }

      if (!destinationCoords) {
        throw new Error(
          `Could not find "${destination}". Try a more specific location, such as "Madina, Accra".`
        )
      }

      setLiveDestination(destinationCoords)
      setOriginCoordinates(originCoords)
      setDestinationCoordinates(destinationCoords)

      const result = await calculateRoute(
        [originCoords, destinationCoords],
        { mode: travelMode, alternatives: false, steps: true }
      )

      if (result.code !== "Ok" || result.routes.length === 0) {
        throw new Error(
          result.message ||
            "Could not calculate a route between these locations."
        )
      }

      const route = result.routes[0]

      if (!route.geometry.coordinates.length) {
        throw new Error(
          "The route was found, but no route geometry was returned."
        )
      }

      // Route geometry is [lng, lat]; the map expects [lat, lng].
      const routeCoordinates = route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number]
      )

      onRouteCalculated(routeCoordinates)

      const steps: RouteStepView[] = route.steps.map((step) => ({
        instruction: step.instruction,
        distance: formatRouteDistance(step.distance),
        duration: formatRouteDuration(step.duration),
        voiceInstruction: step.voiceInstruction,
      }))

      const navigationSteps = route.steps
        .filter((step) => step.geometry && step.geometry.coordinates.length > 0)
        .map((step) => ({
          instruction: step.instruction,
          voiceInstruction: step.voiceInstruction,
          coordinates: step.geometry!.coordinates,
        }))

      setLiveSteps(navigationSteps)

      setRouteInfo({
        distance: formatRouteDistance(route.distance),
        duration: formatRouteDuration(route.duration),
        steps: steps.slice(0, 40),
      })

      if (voiceEnabled && steps[0]?.voiceInstruction) {
        speak(steps[0].voiceInstruction)
      }
    } catch (err) {
      console.error("Lincoln Navigation route calculation error:", err)
      setError(
        err instanceof Error ? err.message : "Unable to calculate route."
      )
    } finally {
      setIsLoading(false)
    }
  }

  /* =======================================================
     START / STOP LIVE NAVIGATION
  ======================================================= */

  const handleStartLiveNavigation = () => {
    setError(null)

    if (!liveDestination) {
      setError("Destination coordinates are missing. Please calculate the route again.")
      return
    }

    if (liveSteps.length === 0) {
      setError("Live navigation data is not available. Please calculate the route again.")
      return
    }

    setIsLiveNavigation(true)

    window.setTimeout(() => {
      startNavigation()
    }, 100)
  }

  const handleStopLiveNavigation = () => {
    stopNavigation()
    setIsLiveNavigation(false)
  }

  /* =======================================================
     SWAP LOCATIONS
  ======================================================= */

  const swapLocations = () => {
    const previousOrigin = origin
    const previousOriginCoordinates = originCoordinates

    setOrigin(destination)
    setOriginCoordinates(destinationCoordinates)
    setDestination(previousOrigin)
    setDestinationCoordinates(previousOriginCoordinates)

    setRouteInfo(null)
    setLiveSteps([])
    setLiveDestination(null)

    stopNavigation()
    setIsLiveNavigation(false)
    setError(null)
  }

  /* =======================================================
     VOICE STEP
  ======================================================= */

  const handleVoiceStep = (step: RouteStepView) => {
    speak(step.voiceInstruction || step.instruction)
  }

  /* =======================================================
     CLOSE
  ======================================================= */

  const handleClose = () => {
    stopNavigation()
    setIsLiveNavigation(false)
    onClose()
  }

  if (!isOpen) {
    return null
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-[400px] bg-card/95 backdrop-blur-xl z-[1001] border-r border-border flex flex-col">
      {/* HEADER */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Directions</h2>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setVoiceEnabled((value) => !value)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label={voiceEnabled ? "Disable voice directions" : "Enable voice directions"}
              title={voiceEnabled ? "Disable voice directions" : "Enable voice directions"}
            >
              {voiceEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Close directions"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TRAVEL MODES */}
        <div className="flex gap-1.5 mb-4">
          {TRAVEL_MODES.map(({ mode, icon: Icon, label }) => (
            <button
              type="button"
              key={mode}
              onClick={() => {
                setTravelMode(mode)
                setRouteInfo(null)
                setLiveSteps([])
                setLiveDestination(null)
                stopNavigation()
                setIsLiveNavigation(false)
                setError(null)
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-colors",
                travelMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </button>
          ))}
        </div>

        {/* LOCATION INPUTS */}
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
            <Input
              placeholder="Starting point"
              value={origin}
              onChange={(event) => {
                setOrigin(event.target.value)
                setOriginCoordinates(null)
                setError(null)
              }}
              className="pl-8 pr-10 bg-secondary border-0"
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              title="Use current location"
              aria-label="Use current location"
            >
              <LocateFixed className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <button
              type="button"
              onClick={swapLocations}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              title="Swap locations"
              aria-label="Swap locations"
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
              onChange={(event) => {
                setDestination(event.target.value)
                setDestinationCoordinates(null)
                setError(null)
              }}
              className="pl-8 bg-secondary border-0"
            />
          </div>

          <Button
            type="button"
            onClick={handleCalculateRoute}
            className="w-full bg-primary hover:bg-primary/90"
            disabled={isLoading || isNavigating}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating route...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </>
            )}
          </Button>

          {routeInfo && (
            <Button
              type="button"
              onClick={handleStartLiveNavigation}
              disabled={isNavigating || liveSteps.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isNavigating ? (
                <>
                  <LocateFixed className="w-4 h-4 mr-2 animate-pulse" />
                  Live Navigation Active
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  Start Live Navigation
                </>
              )}
            </Button>
          )}

          {isNavigating && (
            <Button
              type="button"
              variant="outline"
              onClick={handleStopLiveNavigation}
              className="w-full"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Live Navigation
            </Button>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* ROUTE CONTENT */}
      {routeInfo && (
        <ScrollArea className="flex-1">
          {isNavigating && (
            <div className="mx-4 mt-4 rounded-xl bg-primary text-primary-foreground p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Navigation className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="text-xs opacity-80 uppercase tracking-wide">Live Navigation</p>
                  <p className="font-semibold">{navigationMessage || "Following route..."}</p>
                </div>
              </div>

              {(distanceToDestination !== null || etaSeconds !== null) && (
                <div className="mt-3 flex items-baseline gap-2 text-sm opacity-90">
                  {distanceToDestination !== null && (
                    <span>
                      {distanceToDestination <= 1000
                        ? `${Math.round(distanceToDestination)} m`
                        : `${(distanceToDestination / 1000).toFixed(1)} km`}
                    </span>
                  )}

                  {distanceToDestination !== null && etaSeconds !== null && (
                    <span className="opacity-60">•</span>
                  )}

                  {/* Live, recalculated on every GPS update from the
                      user's actual current speed (see
                      hooks/use-live-navigation.ts) — not the static
                      pre-navigation estimate shown before Start Live
                      Navigation was pressed. */}
                  {etaSeconds !== null && (
                    <span className="font-medium">
                      {formatRouteDuration(etaSeconds)}
                    </span>
                  )}

                  {arrivalTime && (
                    <span className="opacity-75">
                      · arriving{" "}
                      {arrivalTime.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              )}

              {position && (
                <div className="mt-2 text-xs opacity-70">
                  GPS accuracy: {Math.round(position.accuracy)}m
                </div>
              )}

              {liveSteps[currentStepIndex] && (
                <div className="mt-3 rounded-lg bg-white/10 p-3">
                  <p className="text-xs opacity-70">NEXT INSTRUCTION</p>
                  <p className="text-sm font-medium mt-1">
                    {liveSteps[currentStepIndex].instruction}
                  </p>
                </div>
              )}

              {gpsError && (
                <div className="mt-3 rounded-lg bg-black/10 p-2 text-xs">{gpsError}</div>
              )}
            </div>
          )}

          <div className="p-4">
            <div className="bg-secondary rounded-xl p-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                    {isNavigating && etaSeconds !== null ? "Live ETA" : "Estimated"}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {isNavigating && etaSeconds !== null
                      ? formatRouteDuration(etaSeconds)
                      : routeInfo.duration}
                  </p>
                  <p className="text-muted-foreground">
                    {isNavigating && distanceToDestination !== null
                      ? formatRouteDistance(distanceToDestination)
                      : routeInfo.distance}
                  </p>
                  {isNavigating && arrivalTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Arriving{" "}
                      {arrivalTime.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>

                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  {(() => {
                    const ModeIcon =
                      TRAVEL_MODES.find((m) => m.mode === travelMode)
                        ?.icon ?? Car
                    return <ModeIcon className="w-6 h-6 text-primary" />
                  })()}
                </div>
              </div>
            </div>

            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Turn-by-turn
            </h3>

            <div className="space-y-2">
              {routeInfo.steps.map((step, index) => (
                <button
                  key={`${index}-${step.instruction}`}
                  type="button"
                  onClick={() => handleVoiceStep(step)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors",
                    isNavigating && index === currentStepIndex
                      ? "bg-primary/15 ring-1 ring-primary/30"
                      : "bg-secondary/50 hover:bg-secondary"
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">{index + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{step.instruction}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{step.distance}</p>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">{step.duration}</p>
                    </div>
                  </div>

                  <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-5">
              Tap a direction to hear it aloud.
            </p>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
