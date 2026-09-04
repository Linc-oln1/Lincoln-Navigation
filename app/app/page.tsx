"use client"

import { useState, useCallback, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/map/header"
import { SearchPanel } from "@/components/map/search-panel"
import { DirectionsPanel, type TravelMode } from "@/components/map/directions-panel"
import { PlacesPanel } from "@/components/map/places-panel"
import { SavedPlacesPanel } from "@/components/map/saved-places"
import { MapControls } from "@/components/map/map-controls"
import { LocationDetails } from "@/components/map/location-details"
import { MobileNav } from "@/components/map/mobile-nav"
import { geocode } from "@/lib/geocoding"
import { useSavedPlaces, type SavedPlaceInput } from "@/hooks/use-saved-places"

const MapView = dynamic(
  () => import("@/components/map/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">🗺️</span>
          </div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    ),
  }
)

type PanelType = "search" | "directions" | "places" | "saved" | null

export type MapStyle =
  | "light"
  | "dark"
  | "device"
  | "satellite"
  | "terrain"

interface Location {
  name: string
  address: string
  lat: number
  lng: number
  type?: string
}

interface LiveNavigationState {
  isNavigating: boolean
  latitude: number | null
  longitude: number | null
  heading: number | null
  accuracy: number | null
}

const GHANA_CENTER: [number, number] = [7.9465, -1.0232]

const EMPTY_NAVIGATION_STATE: LiveNavigationState = {
  isNavigating: false,
  latitude: null,
  longitude: null,
  heading: null,
  accuracy: null,
}

const VALID_TRAVEL_MODES: TravelMode[] = [
  "driving",
  "motorcycle",
  "bus",
  "walking",
  "cycling",
]

function MapNavigator() {
  const searchParams = useSearchParams()

  const [activePanel, setActivePanel] = useState<PanelType>(null)

  const [initialTravelMode, setInitialTravelMode] =
    useState<TravelMode | undefined>(undefined)

  const [mapCenter, setMapCenter] =
    useState<[number, number]>(GHANA_CENTER)

  // Device theme is the default
  const [mapStyle, setMapStyle] = useState<MapStyle>("device")

  const [selectedLocation, setSelectedLocation] =
    useState<Location | null>(null)

  const savedPlaces = useSavedPlaces()

  // Set when the user taps an unset Home/Work card — the next place
  // picked in search gets saved as that, instead of just being
  // shown on the map like a normal search selection.
  const [homeWorkTarget, setHomeWorkTarget] =
    useState<"home" | "work" | null>(null)

  const [routePoints, setRoutePoints] =
    useState<[number, number][]>([])

  const [markers, setMarkers] = useState<
    Array<{
      position: [number, number]
      title: string
      description?: string
    }>
  >([])

  // Lives here (rather than being trapped inside DirectionsPanel)
  // so MapView can render the real GPS puck + follow camera during
  // live navigation instead of that state dead-ending in the
  // directions UI.
  const [navigationState, setNavigationState] =
    useState<LiveNavigationState>(EMPTY_NAVIGATION_STATE)

  /* =======================================================
     LANDING PAGE HANDOFF

     The marketing landing page's "Plan a route" widget sends
     people here as /app?to=<destination>&mode=<travelMode>.
     On first load, resolve that destination through the same
     geocoder the in-app search bar uses, drop a marker on it,
     and open the directions panel with the requested transport
     mode already selected — so the trip they planned on the
     landing page is waiting for them, not just a blank map.
  ======================================================= */

  useEffect(() => {
    const toQuery = searchParams.get("to")?.trim()
    if (!toQuery) return

    const modeParam = searchParams.get("mode")
    const requestedMode = VALID_TRAVEL_MODES.includes(
      modeParam as TravelMode
    )
      ? (modeParam as TravelMode)
      : undefined

    let cancelled = false

    ;(async () => {
      try {
        const results = await geocode(toQuery, { limit: 1 })
        const best = results[0]

        if (!best || cancelled) return

        setMapCenter([best.lat, best.lng])
        setSelectedLocation({
          name: best.name,
          address: best.address,
          lat: best.lat,
          lng: best.lng,
          type: best.type,
        })
        setMarkers([
          {
            position: [best.lat, best.lng],
            title: best.name,
            description: best.address,
          },
        ])

        if (requestedMode) {
          setInitialTravelMode(requestedMode)
        }

        setActivePanel("directions")
      } catch {
        // The landing page's widget is a convenience, not a
        // guarantee — if geocoding fails, the user just lands on
        // an empty map and can search manually, same as always.
      }
    })()

    return () => {
      cancelled = true
    }
    // Intentionally runs once on mount only — this is a one-time
    // handoff from the landing page's URL, not a live sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenPanel = useCallback((panel: PanelType) => {
    setActivePanel((current) => (current === panel ? null : panel))
  }, [])

  const handleClosePanel = useCallback(() => {
    setActivePanel(null)
  }, [])

  const handleSelectLocation = useCallback(
    (result: {
      id: string
      name: string
      address: string
      lat: number
      lng: number
      type?: string
    }) => {
      setMapCenter([result.lat, result.lng])

      setSelectedLocation({
        name: result.name,
        address: result.address,
        lat: result.lat,
        lng: result.lng,
        type: result.type,
      })

      setMarkers([
        {
          position: [result.lat, result.lng],
          title: result.name,
          description: result.address,
        },
      ])

      if (homeWorkTarget) {
        const place: SavedPlaceInput = {
          name: result.name,
          address: result.address,
          lat: result.lat,
          lng: result.lng,
        }
        if (homeWorkTarget === "home") {
          savedPlaces.setHome(place)
        } else {
          savedPlaces.setWork(place)
        }
        setHomeWorkTarget(null)
      }

      setActivePanel(null)
    },
    [homeWorkTarget, savedPlaces]
  )

  const handleSelectPlace = useCallback(
    (place: {
      id: string
      name: string
      address: string
      lat: number
      lng: number
      type?: string
    }) => {
      setMapCenter([place.lat, place.lng])

      setSelectedLocation({
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        type: place.type,
      })

      setMarkers([
        {
          position: [place.lat, place.lng],
          title: place.name,
          description: place.address,
        },
      ])

      setActivePanel(null)
    },
    []
  )

  const handleSelectSavedPlace = useCallback(
    (place: {
      id: string
      name: string
      address: string
      lat: number
      lng: number
      icon: "home" | "work" | "favorite"
    }) => {
      handleSelectPlace({
        id: place.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        type: place.icon,
      })
    },
    [handleSelectPlace]
  )

  const handleGetDirections = useCallback(() => {
    setActivePanel("directions")
  }, [])

  const handleRouteCalculated = useCallback(
    (points: [number, number][]) => {
      setRoutePoints(points)
    },
    []
  )

  const handleMapClick = useCallback(
    () => {
      if (activePanel) {
        setActivePanel(null)
      }

      if (selectedLocation) {
        setSelectedLocation(null)
        setMarkers([])
      }
    },
    [activePanel, selectedLocation]
  )

  return (
    <main className="h-screen w-screen relative overflow-hidden bg-background">

      {/* MAP */}
      <MapView
        center={mapCenter}
        zoom={8}
        markers={markers}
        routePoints={routePoints}
        mapStyle={mapStyle}
        onMapClick={handleMapClick}
        liveNavigation={navigationState}
      />

      {/* HEADER */}
      <Header
        onSearchClick={() => handleOpenPanel("search")}
        onDirectionsClick={() => handleOpenPanel("directions")}
        onPlacesClick={() => handleOpenPanel("places")}
        activePanel={activePanel}
      />

      {/* MAP STYLE CONTROL */}
      <MapControls
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
      />

      {/* SEARCH */}
      <SearchPanel
        isOpen={activePanel === "search"}
        onClose={handleClosePanel}
        onSelectLocation={handleSelectLocation}
      />

      {/* DIRECTIONS */}
      <DirectionsPanel
        isOpen={activePanel === "directions"}
        onClose={handleClosePanel}
        initialDestination={selectedLocation}
        initialTravelMode={initialTravelMode}
        onRouteCalculated={handleRouteCalculated}
        onNavigationStateChange={setNavigationState}
      />

      {/* PLACES */}
      <PlacesPanel
        isOpen={activePanel === "places"}
        onClose={handleClosePanel}
        onSelectPlace={handleSelectPlace}
        mapCenter={mapCenter}
      />

      {/* SAVED PLACES */}
      <SavedPlacesPanel
        isOpen={activePanel === "saved"}
        onClose={handleClosePanel}
        onSelectPlace={handleSelectSavedPlace}
        favorites={savedPlaces.favorites}
        home={savedPlaces.home}
        work={savedPlaces.work}
        onRemoveFavorite={savedPlaces.removeFavorite}
        onRequestSetHomeWork={(target) => {
          setHomeWorkTarget(target)
          setActivePanel("search")
        }}
      />

      {/* LOCATION DETAILS */}
      {selectedLocation &&
        activePanel !== "directions" && (
          <LocationDetails
            location={selectedLocation}
            isFavorite={savedPlaces.isFavorite(selectedLocation)}
            onToggleFavorite={() => savedPlaces.toggleFavorite(selectedLocation)}
            onClose={() => {
              setSelectedLocation(null)
              setMarkers([])
            }}
            onGetDirections={handleGetDirections}
          />
        )}

      {/* MOBILE NAV */}
      <MobileNav
        activePanel={activePanel}
        onSearchClick={() => handleOpenPanel("search")}
        onDirectionsClick={() => handleOpenPanel("directions")}
        onPlacesClick={() => handleOpenPanel("places")}
        onSavedClick={() => handleOpenPanel("saved")}
      />

      {/* ATTRIBUTION */}
      <div className="absolute bottom-20 md:bottom-4 left-4 z-[999]">
        <div className="bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            Lincoln Navigations • Ghana
          </p>
        </div>
      </div>

    </main>
  )
}

export default function MapNavigatorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-2xl">🗺️</span>
            </div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      }
    >
      <MapNavigator />
    </Suspense>
  )
}
