"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
  Lock,
  Square,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { useLiveNavigation } from "@/hooks/use-live-navigation"
import { usePremium } from "@/hooks/use-premium"
import { RouteHazardWarning } from "@/components/map/route-hazard-warning"
import {
  fetchHazards,
  hazardKindMeta,
  isRouteRelevant,
  type Hazard,
} from "@/lib/hazards"
import {
  hazardsOnRoute,
  routeBBox,
  type OnRouteHazard,
} from "@/lib/hazard-geometry"
import { countTurns, pickSaferRoute } from "@/lib/route-scoring"
import type { AvoidCircle } from "@/lib/geo/avoid-polygon"
import {
  calculateRoute,
  formatDistance as formatRouteDistance,
  formatDuration as formatRouteDuration,
  type Coordinate,
  type Route,
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
  // Tapping a hazard in the "hazards on this route" list asks the
  // app to highlight it on the map.
  onFocusHazard?: (hazard: Hazard) => void
  // A safer alternative route to preview as a faint line, or []
  // to clear it.
  onAlternativeRoute?: (points: [number, number][]) => void
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
  onFocusHazard,
  onAlternativeRoute,
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

  // The active route as [lat, lng] points, plus the community
  // hazards fetched for this calculation's area — used to warn
  // about hazards on the route and to score alternatives.
  const [routeCoords, setRouteCoords] =
    useState<[number, number][] | null>(null)
  const [candidateHazards, setCandidateHazards] = useState<Hazard[]>([])
  const [activeRoute, setActiveRoute] = useState<Route | null>(null)

  // A materially safer alternative to offer, if one exists.
  const [saferAlt, setSaferAlt] = useState<{
    route: Route
    extraSeconds: number
    avoidedCount: number
  } | null>(null)
  const [saferDismissed, setSaferDismissed] = useState(false)

  // "Route around it" — an engine-computed detour past the hazards.
  const [routeAroundBusy, setRouteAroundBusy] = useState(false)
  const [routeAroundError, setRouteAroundError] = useState<string | null>(null)

  // Guards against a stale hazard fetch landing after a newer
  // route calculation.
  const hazardFetchIdRef = useRef(0)

  const routeHazards: OnRouteHazard[] = useMemo(
    () =>
      routeCoords && candidateHazards.length > 0
        ? hazardsOnRoute(routeCoords, candidateHazards.filter(isRouteRelevant))
        : [],
    [routeCoords, candidateHazards]
  )

  const clearRouteExtras = () => {
    setRouteCoords(null)
    setCandidateHazards([])
    setActiveRoute(null)
    setSaferAlt(null)
    setSaferDismissed(false)
    setRouteAroundBusy(false)
    setRouteAroundError(null)
    hazardFetchIdRef.current++
    onAlternativeRoute?.([])
  }

  /* -------------------------------------------------------
     VOICE

     Turn-by-turn voice guidance is a Premium feature (see
     /pricing). Free visitors keep the on-screen step list; the
     spoken layer is gated on the entitlement.
  ------------------------------------------------------- */

  const { isPremium: hasVoice } = usePremium()
  const [voiceWanted, setVoiceWanted] = useState(true)
  const voiceEnabled = voiceWanted && hasVoice

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

  // Mid-navigation reroute plumbing (see handleReroute below).
  const [rerouteBusy, setRerouteBusy] = useState(false)
  const [rerouteError, setRerouteError] = useState<string | null>(null)
  const rerouteInFlightRef = useRef(false)
  const rerouteCooldownRef = useRef(0)
  // The hook's onRerouteNeeded fires from a GPS callback captured
  // once at nav start, so it must be stable — it reaches the latest
  // reroute logic + position through these refs.
  const rerouteFnRef = useRef<(from: [number, number]) => void>(() => {})
  const livePositionRef = useRef<{ lat: number; lng: number } | null>(null)

  const handleAutoReroute = useCallback(() => {
    const p = livePositionRef.current
    if (p) rerouteFnRef.current([p.lng, p.lat])
  }, [])

  const {
    isNavigating,
    position,
    currentStepIndex,
    distanceToDestination,
    etaSeconds,
    arrivalTime,
    navigationMessage,
    gpsError,
    hazardAhead,
    startNavigation,
    stopNavigation,
  } = useLiveNavigation({
    steps: liveSteps,
    destination: liveDestination,
    enabled: isLiveNavigation,
    travelMode,
    routePath: routeCoords ?? [],
    hazards: candidateHazards,
    onRerouteNeeded: handleAutoReroute,
  })

  livePositionRef.current = position
    ? { lat: position.latitude, lng: position.longitude }
    : null

  useEffect(() => {
    if (!isNavigating) {
      setRerouteError(null)
      setRerouteBusy(false)
    }
  }, [isNavigating])

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
     KEEP HAZARDS FRESH DURING NAVIGATION

     A snapshot from route-calc time would miss a flood reported
     after you set off (or one others have since cleared), so
     re-fetch the route's hazards every 90 s while navigating.
  ======================================================= */

  useEffect(() => {
    if (!isNavigating || !routeCoords || routeCoords.length < 2) return

    let cancelled = false
    const bbox = routeBBox(routeCoords)

    const poll = async () => {
      try {
        const res = await fetchHazards(bbox)
        if (!cancelled) setCandidateHazards(res.hazards)
      } catch {
        // Keep the last good set; try again next tick.
      }
    }

    const id = setInterval(poll, 90_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isNavigating, routeCoords])

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
      onAlternativeRoute?.([])
    }
  }, [isOpen, stopNavigation, onAlternativeRoute])

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
     APPLYING A ROUTE (fastest, or a swapped-in alternative)
  ======================================================= */

  const toLatLng = (route: Route): [number, number][] =>
    route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    )

  const applyRoute = (
    route: Route,
    opts: { speakFirst?: boolean } = {}
  ) => {
    const coords = toLatLng(route)
    onRouteCalculated(coords)
    setRouteCoords(coords)
    setActiveRoute(route)

    const steps: RouteStepView[] = route.steps.map((step) => ({
      instruction: step.instruction,
      distance: formatRouteDistance(step.distance),
      duration: formatRouteDuration(step.duration),
      voiceInstruction: step.voiceInstruction,
    }))

    setLiveSteps(
      route.steps
        .filter((s) => s.geometry && s.geometry.coordinates.length > 0)
        .map((s) => ({
          instruction: s.instruction,
          voiceInstruction: s.voiceInstruction,
          coordinates: s.geometry!.coordinates,
        }))
    )

    setRouteInfo({
      distance: formatRouteDistance(route.distance),
      duration: formatRouteDuration(route.duration),
      steps: steps.slice(0, 40),
    })

    if (opts.speakFirst && voiceEnabled && steps[0]?.voiceInstruction) {
      speak(steps[0].voiceInstruction)
    }
  }

  /* =======================================================
     COMMUNITY HAZARDS ON THE ROUTE + SAFER-ROUTE OFFER
  ======================================================= */

  const loadRouteHazards = async (routes: Route[], fastestId: string) => {
    const fetchId = ++hazardFetchIdRef.current

    const allPoints = routes.flatMap(toLatLng)
    let hazards: Hazard[] = []
    try {
      const res = await fetchHazards(routeBBox(allPoints))
      hazards = res.hazards
    } catch {
      hazards = []
    }
    if (hazardFetchIdRef.current !== fetchId) return // superseded

    setCandidateHazards(hazards)

    // Only point-scale sources should influence which route we offer —
    // region-centroid "official" alerts must not (same filter the
    // warning banner and live-nav hook apply).
    const routable = hazards.filter(isRouteRelevant)

    if (routes.length < 2 || routable.length === 0) {
      setSaferAlt(null)
      onAlternativeRoute?.([])
      return
    }

    const perRoute = routes.map((route) => {
      const onRoute = hazardsOnRoute(toLatLng(route), routable)
      const severities = onRoute.map((o) => o.hazard.severity)
      return {
        route,
        onRoute,
        input: {
          id: route.id,
          durationSeconds: route.duration,
          turnCount: countTurns(route.steps),
          hazardSeverityTotal: severities.reduce((s, v) => s + v, 0),
          hazardCount: severities.length,
          hazardMaxSeverity: severities.reduce((m, v) => Math.max(m, v), 0),
        },
      }
    })

    const pick = pickSaferRoute(
      perRoute.map((p) => p.input),
      fastestId
    )
    if (!pick) {
      setSaferAlt(null)
      onAlternativeRoute?.([])
      return
    }

    const safer = perRoute.find((p) => p.route.id === pick.saferId)
    const fastest = perRoute.find((p) => p.route.id === fastestId)
    if (!safer || !fastest) return

    const saferIds = new Set(safer.onRoute.map((o) => o.hazard.id))
    const avoidedCount = fastest.onRoute.filter(
      (o) => !saferIds.has(o.hazard.id)
    ).length

    setSaferAlt({
      route: safer.route,
      extraSeconds: pick.extraSeconds,
      avoidedCount,
    })
    onAlternativeRoute?.(toLatLng(safer.route))
  }

  const handleUseSaferRoute = () => {
    if (!saferAlt) return
    applyRoute(saferAlt.route)
    setSaferAlt(null)
    setSaferDismissed(false)
    onAlternativeRoute?.([])
  }

  const handleDismissSafer = () => {
    setSaferDismissed(true)
    onAlternativeRoute?.([])
  }

  /* =======================================================
     ROUTE AROUND IT — ask a routing engine (ORS) for a route
     that actually excludes the roads near the hazards. Only
     offered when there's a hazard on the route and no plain
     alternative already avoids it.
  ======================================================= */

  const handleRouteAround = async () => {
    if (
      routeAroundBusy ||
      routeHazards.length === 0 ||
      !originCoordinates ||
      !destinationCoordinates
    ) {
      return
    }

    setRouteAroundBusy(true)
    setRouteAroundError(null)

    const targets = routeHazards.map((h) => h.hazard)
    const avoidAreas = targets.map((h) => ({
      lat: h.location.lat,
      lng: h.location.lng,
      radiusM: 170,
    }))

    try {
      const result = await calculateRoute(
        [originCoordinates, destinationCoordinates],
        { mode: travelMode, avoidAreas, steps: true }
      )

      const route = result.routes?.[0]
      if (result.code !== "Ok" || !route || !route.geometry.coordinates.length) {
        throw new Error("no-route")
      }

      const newCoords = toLatLng(route)

      // Did it actually get clear of them?
      const stillOn = hazardsOnRoute(newCoords, targets, { thresholdM: 140 })
      if (stillOn.length > 0) {
        throw new Error("still-on")
      }

      // Reject a detour that's wildly longer than the current route.
      const currentSeconds = activeRoute?.duration ?? route.duration
      if (route.duration > currentSeconds * 2.5 + 300) {
        throw new Error("too-long")
      }

      applyRoute(route)
      setSaferAlt(null)
      onAlternativeRoute?.([])
    } catch (err) {
      const reason = err instanceof Error ? err.message : ""
      setRouteAroundError(
        reason === "too-long"
          ? "The only way around is much too long."
          : reason === "still-on"
            ? "Couldn't find a route that clears it."
            : "Couldn't find a way around right now."
      )
    } finally {
      setRouteAroundBusy(false)
    }
  }

  /* =======================================================
     MID-NAVIGATION REROUTE

     Two callers: an automatic recalculation when the hook reports
     the driver has drifted off the line (avoid = []), and a
     "Reroute" tap when a closure is reported ahead (avoid = a
     circle around it). Both recompute from the CURRENT GPS
     position to the same destination and swap the live route in
     place — the hook restarts step tracking on the new steps.
  ======================================================= */

  const rerouteFrom = async (
    from: [number, number],
    avoidHazards: Hazard[]
  ) => {
    if (
      rerouteInFlightRef.current ||
      !liveDestination ||
      Date.now() - rerouteCooldownRef.current < 8000
    ) {
      return
    }

    rerouteInFlightRef.current = true
    rerouteCooldownRef.current = Date.now()
    setRerouteBusy(true)
    setRerouteError(null)

    const avoidAreas: AvoidCircle[] = avoidHazards.map((h) => ({
      lat: h.location.lat,
      lng: h.location.lng,
      radiusM: 180,
    }))

    try {
      const result = await calculateRoute([from, liveDestination], {
        mode: travelMode,
        avoidAreas: avoidAreas.length > 0 ? avoidAreas : undefined,
        steps: true,
      })

      const route = result.routes?.[0]
      if (
        result.code !== "Ok" ||
        !route ||
        route.geometry.coordinates.length < 2 ||
        route.steps.length === 0
      ) {
        throw new Error("no-route")
      }

      if (avoidHazards.length > 0) {
        const stillOn = hazardsOnRoute(toLatLng(route), avoidHazards, {
          thresholdM: 140,
        })
        if (stillOn.length > 0) throw new Error("still-on")
      }

      applyRoute(route)
      setRerouteError(null)
      if (voiceEnabled) speak("New route.")
    } catch (err) {
      const reason = err instanceof Error ? err.message : ""
      setRerouteError(
        reason === "still-on"
          ? "Couldn't find a way around — it may block the only road."
          : avoidHazards.length > 0
            ? "Couldn't reroute right now."
            : null // silent off-route retry — no banner, try again next tick
      )
    } finally {
      rerouteInFlightRef.current = false
      setRerouteBusy(false)
    }
  }

  rerouteFnRef.current = (from) => {
    void rerouteFrom(from, [])
  }

  const handleRerouteAroundHazard = () => {
    const p = livePositionRef.current
    if (!p || !hazardAhead) return
    void rerouteFrom([p.lng, p.lat], [hazardAhead.hazard])
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
    clearRouteExtras()

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
        { mode: travelMode, alternatives: true, steps: true }
      )

      if (result.code !== "Ok" || result.routes.length === 0) {
        throw new Error(
          result.message ||
            "Could not calculate a route between these locations."
        )
      }

      const usable = result.routes.filter(
        (r) => r.geometry.coordinates.length > 0
      )
      if (usable.length === 0) {
        throw new Error(
          "The route was found, but no route geometry was returned."
        )
      }

      // OSRM doesn't guarantee the routes come back fastest-first.
      const fastest = usable.reduce((a, b) =>
        b.duration < a.duration ? b : a
      )

      applyRoute(fastest, { speakFirst: true })

      // Score the fastest route + any alternatives against the
      // community hazards for this area — off the critical path, so
      // the route shows immediately and the warning/offer follows.
      void loadRouteHazards(usable, fastest.id)
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

    // Lock in the current route for navigation — no swapping mid-trip.
    setSaferAlt(null)
    onAlternativeRoute?.([])

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
    clearRouteExtras()
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
    // Reading a step aloud is part of the Premium voice feature.
    if (!hasVoice) {
      window.location.href = "/pricing"
      return
    }
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
            {hasVoice ? (
              <button
                type="button"
                onClick={() => setVoiceWanted((value) => !value)}
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
            ) : (
              <a
                href="/pricing"
                className="p-2 hover:bg-secondary rounded-lg transition-colors flex items-center"
                title="Turn-by-turn voice navigation is a Premium feature"
                aria-label="Unlock voice navigation with Premium"
              >
                <span className="relative">
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                  <Lock className="w-2.5 h-2.5 absolute -right-1 -top-1 text-primary" />
                </span>
              </a>
            )}

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
                clearRouteExtras()
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

              {hazardAhead && (
                <div className="mt-3 rounded-lg bg-white p-3 flex items-center gap-2.5">
                  <span className="text-lg leading-none" aria-hidden>
                    {hazardKindMeta(hazardAhead.hazard.kind).emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-red-600">
                      {hazardAhead.hazard.source === "crowd_report"
                        ? `Reported ${hazardKindMeta(hazardAhead.hazard.kind).label.toLowerCase()}`
                        : `${hazardKindMeta(hazardAhead.hazard.kind).label} area`}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {rerouteError
                        ? rerouteError
                        : hazardAhead.distanceM <= 60
                          ? "right ahead"
                          : `${Math.round(hazardAhead.distanceM / 50) * 50} m ahead`}
                    </p>
                  </div>
                  {hazardAhead.hazard.kind === "closure" &&
                    hazardAhead.distanceM >= 150 &&
                    !rerouteError && (
                      <button
                        type="button"
                        onClick={handleRerouteAroundHazard}
                        disabled={rerouteBusy}
                        className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white hover:opacity-90 transition-opacity disabled:opacity-60 inline-flex items-center gap-1.5"
                      >
                        {rerouteBusy && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        Reroute
                      </button>
                    )}
                </div>
              )}

              {gpsError && (
                <div className="mt-3 rounded-lg bg-black/10 p-2 text-xs">{gpsError}</div>
              )}
            </div>
          )}

          <div className="p-4">
            <RouteHazardWarning
              items={routeHazards}
              onFocus={(hazard) => onFocusHazard?.(hazard)}
              saferRoute={
                saferAlt && !saferDismissed && !isNavigating
                  ? {
                      extraSeconds: saferAlt.extraSeconds,
                      avoidedCount: saferAlt.avoidedCount,
                    }
                  : null
              }
              onUseSaferRoute={handleUseSaferRoute}
              onDismissSafer={handleDismissSafer}
              onRouteAround={
                !isNavigating ? handleRouteAround : undefined
              }
              routeAroundBusy={routeAroundBusy}
              routeAroundError={routeAroundError}
            />

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

                  {hasVoice ? (
                    <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-5">
              {hasVoice ? (
                "Tap a direction to hear it aloud."
              ) : (
                <>
                  <a href="/pricing" className="text-primary font-medium hover:underline">
                    Upgrade to Premium
                  </a>{" "}
                  for turn-by-turn voice navigation.
                </>
              )}
            </p>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
