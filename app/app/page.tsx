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
import { WeatherWidget } from "@/components/map/weather-widget"
import { HazardDetails } from "@/components/map/hazard-details"
import { ReportHazardSheet } from "@/components/map/report-hazard-sheet"
import { geocode } from "@/lib/geocoding"
import { useSavedPlaces, type SavedPlaceInput } from "@/hooks/use-saved-places"
import { useHazards } from "@/hooks/use-hazards"
import { useI18n } from "@/components/i18n/language-provider"
import { usePremium } from "@/hooks/use-premium"
import { TrafficToggle } from "@/components/map/traffic-toggle"
import type { BBox, Hazard } from "@/lib/hazards"
import { X as CloseIcon, Sparkles, TriangleAlert } from "lucide-react"

function MapLoading({ className }: { className: string }) {
  const { t } = useI18n()
  return (
    <div className={`${className} bg-background flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-2xl">🗺️</span>
        </div>
        <p className="text-muted-foreground">{t("page.loading")}</p>
      </div>
    </div>
  )
}

const MapView = dynamic(
  () => import("@/components/map/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => <MapLoading className="h-full w-full" />,
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
  // Set for paid placements picked from the Explore Nearby panel —
  // drives the "Sponsored" tag + advertiser link in LocationDetails.
  sponsored?: boolean
  url?: string
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
  const { t } = useI18n()

  const [activePanel, setActivePanel] = useState<PanelType>(null)

  const [initialTravelMode, setInitialTravelMode] =
    useState<TravelMode | undefined>(undefined)

  const [mapCenter, setMapCenter] =
    useState<[number, number]>(GHANA_CENTER)

  // Where the weather widget reads from. Tracks the map center as
  // the user pans (via MapView's onCenterChange) without feeding
  // back into MapView's own `center` prop — that would fight the
  // camera. Falls back to mapCenter until the first user pan.
  const [weatherCenter, setWeatherCenter] =
    useState<[number, number] | null>(null)

  // Visible map bounds → community hazard reports for that area.
  const [mapBounds, setMapBounds] = useState<BBox | null>(null)
  const hazardsApi = useHazards(mapBounds)
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [userLocation, setUserLocation] =
    useState<[number, number] | null>(null)

  // Device theme is the default
  const [mapStyle, setMapStyle] = useState<MapStyle>("device")
  // Live traffic overlay: Premium only; the choice is remembered on the device.
  const { isPremium } = usePremium()
  const [trafficOn, setTrafficOn] = useState(false)
  useEffect(() => {
    try {
      setTrafficOn(localStorage.getItem("ln_traffic") === "1")
    } catch {}
  }, [])
  const showTraffic = isPremium && trafficOn
  const toggleTraffic = () => {
    setTrafficOn((on) => {
      const next = !on
      try {
        localStorage.setItem("ln_traffic", next ? "1" : "0")
      } catch {}
      return next
    })
  }

  const [selectedLocation, setSelectedLocation] =
    useState<Location | null>(null)

  // Shown when a free visitor tries to save past FREE_LIMITS.savedPlaces.
  const [savedLimitHit, setSavedLimitHit] = useState(false)

  const savedPlaces = useSavedPlaces()

  // Set when the user taps an unset Home/Work card — the next place
  // picked in search gets saved as that, instead of just being
  // shown on the map like a normal search selection.
  const [homeWorkTarget, setHomeWorkTarget] =
    useState<"home" | "work" | null>(null)

  const [routePoints, setRoutePoints] =
    useState<[number, number][]>([])

  // A faint "safer alternative" line shown while the directions
  // panel is offering a route around a hazard.
  const [alternativeRoutePoints, setAlternativeRoutePoints] =
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
      sponsored?: boolean
      url?: string
    }) => {
      setMapCenter([place.lat, place.lng])

      setSelectedLocation({
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        type: place.type,
        sponsored: place.sponsored,
        url: place.url,
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

  const handleCenterChange = useCallback((lat: number, lng: number) => {
    setWeatherCenter([lat, lng])
  }, [])

  const handleBoundsChange = useCallback((bbox: BBox) => {
    setMapBounds(bbox)
  }, [])

  const handleUserLocation = useCallback((lat: number, lng: number) => {
    setUserLocation([lat, lng])
  }, [])

  const handleHazardSelect = useCallback((hazard: Hazard) => {
    setSelectedHazard(hazard)
    setSelectedLocation(null)
    setActivePanel(null)
  }, [])

  // From the directions panel's "hazards on this route" list — keep
  // the panel open, just highlight the hazard and bring it into view.
  const handleFocusHazard = useCallback((hazard: Hazard) => {
    setSelectedHazard(hazard)
    setMapCenter([hazard.location.lat, hazard.location.lng])
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

      if (selectedHazard) {
        setSelectedHazard(null)
      }
    },
    [activePanel, selectedLocation, selectedHazard]
  )

  return (
    <main className="h-screen w-screen relative overflow-hidden bg-background">

      {/* MAP */}
      <MapView
        center={mapCenter}
        zoom={8}
        markers={markers}
        routePoints={routePoints}
        alternativeRoutePoints={alternativeRoutePoints}
        mapStyle={mapStyle}
        onMapClick={handleMapClick}
        onCenterChange={handleCenterChange}
        onBoundsChange={handleBoundsChange}
        onUserLocationChange={handleUserLocation}
        hazards={hazardsApi.hazards}
        selectedHazardId={selectedHazard?.id ?? null}
        onHazardSelect={handleHazardSelect}
        liveNavigation={navigationState}
        showTraffic={showTraffic}
      />

      {/* HEADER */}
      <Header
        onSearchClick={() => handleOpenPanel("search")}
        onDirectionsClick={() => handleOpenPanel("directions")}
        onPlacesClick={() => handleOpenPanel("places")}
        activePanel={activePanel}
        isNavigating={navigationState.isNavigating}
      />

      {/* MAP STYLE CONTROL */}
      <TrafficToggle
        isPremium={isPremium}
        showTraffic={showTraffic}
        onToggle={toggleTraffic}
      />

      <MapControls
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
      />

      {/* WEATHER */}
      <WeatherWidget center={weatherCenter ?? mapCenter} />

      {/* REPORT A HAZARD */}
      {hazardsApi.configured && !reportOpen && !selectedHazard && (
        <button
          onClick={() => setReportOpen(true)}
          className="absolute left-4 bottom-32 md:bottom-16 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card/90 backdrop-blur-sm text-foreground shadow-lg hover:bg-card transition-colors"
        >
          <TriangleAlert className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">{t("map.report")}</span>
        </button>
      )}

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
        onFocusHazard={handleFocusHazard}
        onAlternativeRoute={setAlternativeRoutePoints}
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
        favoritesLimit={savedPlaces.favoritesLimit}
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
            onToggleFavorite={() => {
              if (
                savedPlaces.toggleFavorite(selectedLocation) === "limit-reached"
              ) {
                setSavedLimitHit(true)
              }
            }}
            onClose={() => {
              setSelectedLocation(null)
              setMarkers([])
            }}
            onGetDirections={handleGetDirections}
          />
        )}

      {/* HAZARD DETAILS */}
      {selectedHazard && activePanel !== "directions" && (
        <HazardDetails
          hazard={selectedHazard}
          onClose={() => setSelectedHazard(null)}
          onVoted={(updated) => {
            hazardsApi.upsert(updated)
            setSelectedHazard(
              updated.status === "active" ? updated : null
            )
            if (updated.status !== "active") {
              hazardsApi.remove(updated.id)
            }
          }}
        />
      )}

      {/* REPORT HAZARD SHEET */}
      <ReportHazardSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        mapCenter={
          mapBounds
            ? [
                (mapBounds.minLat + mapBounds.maxLat) / 2,
                (mapBounds.minLng + mapBounds.maxLng) / 2,
              ]
            : mapCenter
        }
        userLocation={userLocation}
        onReported={(hazard) => {
          hazardsApi.upsert(hazard)
          setSelectedHazard(hazard)
        }}
      />

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

      {/* SAVED-PLACES LIMIT → UPGRADE PROMPT */}
      {savedLimitHit && (
        <div className="absolute inset-x-4 bottom-24 md:inset-x-auto md:right-4 md:bottom-4 md:w-[360px] z-[1002] bg-card border border-primary/40 rounded-2xl shadow-2xl p-4">
          <button
            onClick={() => setSavedLimitHit(false)}
            aria-label={t("page.dismiss")}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm">{t("page.limitTitle")}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            {t("page.limitFree", { n: savedPlaces.favoritesLimit })}{" "}
            {t("page.limitBody")}
          </p>
          <a
            href="/pricing"
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 transition"
          >
            {t("page.seePremium")}
          </a>
        </div>
      )}

    </main>
  )
}

export default function MapNavigatorPage() {
  return (
    <Suspense
      fallback={<MapLoading className="h-screen w-screen" />}
    >
      <MapNavigator />
    </Suspense>
  )
}
