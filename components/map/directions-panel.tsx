"use client"

import { useEffect, useState } from "react"

import {
  X,
  Navigation,
  Car,
  Footprints,
  Bike,
  ArrowRight,
  Loader2,
  LocateFixed,
  Volume2,
  VolumeX,
  TrafficCone,
  Square,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import { useLiveNavigation } from "@/hooks/use-live-navigation"

/* =========================================================
   TYPES
========================================================= */

interface Location {
  name: string
  lat: number
  lng: number
}

interface DirectionsPanelProps {
  isOpen: boolean
  onClose: () => void
  initialDestination?: Location | null
  onRouteCalculated: (
    points: [number, number][]
  ) => void
}

type TravelMode =
  | "driving"
  | "walking"
  | "cycling"

interface RouteStep {
  instruction: string
  distance: string
  duration: string
  voiceInstruction?: string
  congestion?: string
}

interface RouteInfo {
  distance: string
  duration: string
  steps: RouteStep[]
  trafficDuration?: string
  hasTrafficData: boolean
}

interface MapboxFeature {
  center?: [number, number]
  geometry?: {
    coordinates?: [number, number] | [number, number][]
  }
  place_name?: string
}

interface MapboxGeocodingResponse {
  features?: MapboxFeature[]
  message?: string
}

interface MapboxVoiceInstruction {
  announcement?: string
  distanceAlongGeometry?: number
}

interface MapboxStep {
  distance: number
  duration: number
  name?: string

  geometry?: {
    coordinates?: [number, number][]
  }

  maneuver?: {
    instruction?: string
    type?: string
    modifier?: string
  }

  voiceInstructions?: MapboxVoiceInstruction[]

  congestion?: string[]
}

interface MapboxLeg {
  steps?: MapboxStep[]

  annotation?: {
    congestion?: string[]
  }
}

interface MapboxRoute {
  distance: number
  duration: number

  geometry?: {
    coordinates?: [number, number][]
  }

  legs?: MapboxLeg[]

  duration_typical?: number
}

interface MapboxDirectionsResponse {
  code?: string
  message?: string
  routes?: MapboxRoute[]
}

/* =========================================================
   MAPBOX CONFIGURATION
========================================================= */

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

/*
 * Ghana bounding box:
 *
 * west, south, east, north
 */
const GHANA_BBOX =
  "-3.3,4.5,1.3,11.3"

/* =========================================================
   KNOWN GHANA LOCATIONS
========================================================= */

/*
 * These are used before Mapbox geocoding.
 *
 * This makes common Ghanaian locations faster and
 * prevents unnecessary geocoding failures.
 */
const GHANA_LOCATIONS: Record<
  string,
  [number, number]
> = {
  /* -------------------------------------------------------
     GREATER ACCRA
  ------------------------------------------------------- */

  accra: [
    -0.187,
    5.6037,
  ],

  "accra central": [
    -0.187,
    5.6037,
  ],

  madina: [
    -0.1667,
    5.6833,
  ],

  "madina accra": [
    -0.1667,
    5.6833,
  ],

  adenta: [
    -0.1542,
    5.7142,
  ],

  legon: [
    -0.1869,
    5.6508,
  ],

  "legon accra": [
    -0.1869,
    5.6508,
  ],

  osu: [
    -0.1864,
    5.5573,
  ],

  spintex: [
    -0.1289,
    5.6362,
  ],

  achimota: [
    -0.2296,
    5.6131,
  ],

  kasoa: [
    -0.4168,
    5.5345,
  ],

  tema: [
    -0.0166,
    5.6698,
  ],

  kwabenya: [
    -0.2333,
    5.7156,
  ],

  "kwabenya accra": [
    -0.2333,
    5.7156,
  ],

  "kwabenya, accra": [
    -0.2333,
    5.7156,
  ],

  "dansoman": [
    -0.2491,
    5.5578,
  ],

  "kaneshie": [
    -0.2356,
    5.5719,
  ],

  "lapaz": [
    -0.2457,
    5.6048,
  ],

  "north kaneshie": [
    -0.238,
    5.586,
  ],

  "teshie": [
    -0.105,
    5.583,
  ],

  "nungua": [
    -0.078,
    5.598,
  ],

  "east legon": [
    -0.166,
    5.638,
  ],

  "airport city": [
    -0.171,
    5.605,
  ],

  "osu oxford street": [
    -0.182,
    5.556,
  ],

  /* -------------------------------------------------------
     ASHANTI
  ------------------------------------------------------- */

  kumasi: [
    -1.6244,
    6.6885,
  ],

  /* -------------------------------------------------------
     WESTERN
  ------------------------------------------------------- */

  takoradi: [
    -1.7554,
    4.9016,
  ],

  /* -------------------------------------------------------
     CENTRAL
  ------------------------------------------------------- */

  "cape coast": [
    -1.2466,
    5.1053,
  ],

  /* -------------------------------------------------------
     NORTHERN
  ------------------------------------------------------- */

  tamale: [
    -0.8393,
    9.4075,
  ],

  /* -------------------------------------------------------
     EASTERN
  ------------------------------------------------------- */

  koforidua: [
    -0.2591,
    6.0941,
  ],

  /* -------------------------------------------------------
     BONO
  ------------------------------------------------------- */

  sunyani: [
    -2.3266,
    7.3399,
  ],

  /* -------------------------------------------------------
     VOLTA
  ------------------------------------------------------- */

  ho: [
    0.4713,
    6.6008,
  ],

  /* -------------------------------------------------------
     UPPER WEST
  ------------------------------------------------------- */

  wa: [
    -2.5019,
    10.0601,
  ],

  /* -------------------------------------------------------
     UPPER EAST
  ------------------------------------------------------- */

  bolgatanga: [
    -0.8514,
    10.7856,
  ],
}

/* =========================================================
   GHANA LOCATION ALIASES
========================================================= */

const GHANA_ALIASES: Record<
  string,
  string
> = {
  /*
   * Accra
   */

  accra:
    "Accra, Ghana",

  "accra central":
    "Accra Central, Accra, Ghana",

  /*
   * Greater Accra
   */

  madina:
    "Madina, Accra, Ghana",

  "madina accra":
    "Madina, Accra, Ghana",

  adenta:
    "Adenta, Accra, Ghana",

  legon:
    "Legon, Accra, Ghana",

  "legon accra":
    "Legon, Accra, Ghana",

  osu:
    "Osu, Accra, Ghana",

  spintex:
    "Spintex, Accra, Ghana",

  achimota:
    "Achimota, Accra, Ghana",

  kasoa:
    "Kasoa, Ghana",

  tema:
    "Tema, Ghana",

  /*
   * IMPORTANT:
   * Support Kwabenya explicitly.
   */

  kwabenya:
    "Kwabenya, Accra, Ghana",

  "kwabenya accra":
    "Kwabenya, Accra, Ghana",

  "kwabenya, accra":
    "Kwabenya, Accra, Ghana",

  /*
   * Other Accra areas
   */

  dansoman:
    "Dansoman, Accra, Ghana",

  kaneshie:
    "Kaneshie, Accra, Ghana",

  lapaz:
    "Lapaz, Accra, Ghana",

  "north kaneshie":
    "North Kaneshie, Accra, Ghana",

  teshie:
    "Teshie, Accra, Ghana",

  nungua:
    "Nungua, Accra, Ghana",

  "east legon":
    "East Legon, Accra, Ghana",

  "airport city":
    "Airport City, Accra, Ghana",

  "osu oxford street":
    "Oxford Street, Osu, Accra, Ghana",

  /*
   * Other cities
   */

  kumasi:
    "Kumasi, Ghana",

  takoradi:
    "Takoradi, Ghana",

  "cape coast":
    "Cape Coast, Ghana",

  tamale:
    "Tamale, Ghana",

  koforidua:
    "Koforidua, Ghana",

  sunyani:
    "Sunyani, Ghana",

  ho:
    "Ho, Ghana",

  wa:
    "Wa, Ghana",

  bolgatanga:
    "Bolgatanga, Ghana",
}

/* =========================================================
   NORMALIZE QUERY
========================================================= */

function normalizeQuery(
  query: string
): string {
  return query
    .trim()
    .replace(/\s+/g, " ")
}

/* =========================================================
   GET KNOWN GHANA LOCATION
========================================================= */

function getKnownGhanaLocation(
  query: string
): [number, number] | null {
  const normalized =
    normalizeQuery(
      query
    ).toLowerCase()

  /*
   * Exact match.
   */
  if (
    GHANA_LOCATIONS[
      normalized
    ]
  ) {
    return GHANA_LOCATIONS[
      normalized
    ]
  }

  /*
   * Remove Ghana / Accra suffixes.
   */
  const simplified =
    normalized
      .replace(
        /,?\s*ghana$/i,
        ""
      )
      .replace(
        /,?\s*accra$/i,
        ""
      )
      .trim()

  if (
    GHANA_LOCATIONS[
      simplified
    ]
  ) {
    return GHANA_LOCATIONS[
      simplified
    ]
  }

  return null
}

/* =========================================================
   BUILD SEARCH QUERIES
========================================================= */

function buildGhanaSearchQueries(
  query: string
): string[] {
  const cleaned =
    normalizeQuery(query)

  if (!cleaned) {
    return []
  }

  const lower =
    cleaned.toLowerCase()

  const alias =
    GHANA_ALIASES[lower]

  const queries = [
    alias,
    `${cleaned}, Accra, Ghana`,
    `${cleaned}, Ghana`,
    cleaned,
  ].filter(
    (
      value
    ): value is string =>
      Boolean(value)
  )

  /*
   * Remove duplicates.
   */
  return Array.from(
    new Set(queries)
  )
}

/* =========================================================
   EXTRACT FEATURE COORDINATES
========================================================= */

function getFeatureCoordinates(
  feature: MapboxFeature
): [number, number] | null {
  if (
    feature.center &&
    feature.center.length >= 2
  ) {
    return [
      feature.center[0],
      feature.center[1],
    ]
  }

  const coordinates =
    feature.geometry
      ?.coordinates

  if (
    Array.isArray(
      coordinates
    ) &&
    coordinates.length >= 2 &&
    typeof coordinates[0] ===
      "number" &&
    typeof coordinates[1] ===
      "number"
  ) {
    return [
      coordinates[0] as number,
      coordinates[1] as number,
    ]
  }

  return null
}

/* =========================================================
   CHECK GHANA COORDINATES
========================================================= */

function isInsideGhana(
  coordinates: [number, number]
): boolean {
  const [
    longitude,
    latitude,
  ] = coordinates

  return (
    longitude >= -3.3 &&
    longitude <= 1.3 &&
    latitude >= 4.5 &&
    latitude <= 11.3
  )
}

/* =========================================================
   GEOCODING
========================================================= */

async function geocodeLocation(
  query: string
): Promise<
  [number, number] | null
> {
  if (!MAPBOX_TOKEN) {
    throw new Error(
      "Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. Add it to .env.local and restart the development server."
    )
  }

  const cleaned =
    normalizeQuery(query)

  if (!cleaned) {
    return null
  }

  /*
   * -------------------------------------------------------
   * STEP 1
   * Check our Ghana location database.
   * -------------------------------------------------------
   */

  const knownLocation =
    getKnownGhanaLocation(
      cleaned
    )

  if (knownLocation) {
    return knownLocation
  }

  /*
   * -------------------------------------------------------
   * STEP 2
   * Try several Mapbox search variants.
   *
   * This is especially important for:
   *
   * Kwabenya
   * Madina
   * Adenta
   * Legon
   * Spintex
   * etc.
   * -------------------------------------------------------
   */

  const searchQueries =
    buildGhanaSearchQueries(
      cleaned
    )

  for (const searchQuery of
    searchQueries) {
    try {
      const params =
        new URLSearchParams({
          q: searchQuery,

          country:
            "GH",

          bbox:
            GHANA_BBOX,

          limit:
            "10",

          language:
            "en",

          access_token:
            MAPBOX_TOKEN,
        })

      const response =
        await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`,
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json",
            },
          }
        )

      if (!response.ok) {
        continue
      }

      const data =
        (await response.json()) as MapboxGeocodingResponse

      const features =
        data.features || []

      /*
       * Look through ALL returned results
       * rather than blindly taking features[0].
       */
      for (const feature of
        features) {
        const coordinates =
          getFeatureCoordinates(
            feature
          )

        if (
          coordinates &&
          isInsideGhana(
            coordinates
          )
        ) {
          return coordinates
        }
      }
    } catch {
      /*
       * Try the next query.
       */
      continue
    }
  }

  /*
   * -------------------------------------------------------
   * STEP 3
   * Final fallback without bbox.
   *
   * This helps when Mapbox has a valid Ghana location
   * but its search ranking doesn't cooperate with the
   * Ghana bounding box.
   * -------------------------------------------------------
   */

  try {
    const fallbackParams =
      new URLSearchParams({
        q: `${cleaned}, Ghana`,

        country:
          "GH",

        limit:
          "10",

        language:
          "en",

        access_token:
          MAPBOX_TOKEN,
      })

    const response =
      await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?${fallbackParams.toString()}`,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json",
          },
        }
      )

    if (response.ok) {
      const data =
        (await response.json()) as MapboxGeocodingResponse

      for (const feature of
        data.features || []) {
        const coordinates =
          getFeatureCoordinates(
            feature
          )

        if (
          coordinates &&
          isInsideGhana(
            coordinates
          )
        ) {
          return coordinates
        }
      }
    }
  } catch {
    // Final fallback failed.
  }

  return null
}

/* =========================================================
   FORMAT DISTANCE
========================================================= */

function formatDistance(
  meters: number
): string {
  if (
    !Number.isFinite(
      meters
    )
  ) {
    return "Unknown distance"
  }

  if (meters >= 1000) {
    return `${(
      meters / 1000
    ).toFixed(1)} km`
  }

  return `${Math.round(
    meters
  )} m`
}

/* =========================================================
   FORMAT DURATION
========================================================= */

function formatDuration(
  seconds: number
): string {
  if (
    !Number.isFinite(
      seconds
    )
  ) {
    return "Unknown time"
  }

  const minutes =
    Math.max(
      1,
      Math.round(
        seconds / 60
      )
    )

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours =
    Math.floor(
      minutes / 60
    )

  const remainingMinutes =
    minutes % 60

  if (
    remainingMinutes === 0
  ) {
    return `${hours} hr`
  }

  return `${hours} hr ${remainingMinutes} min`
}

/* =========================================================
   TRAFFIC LABEL
========================================================= */

function getTrafficLabel(
  congestion?: string
): string | undefined {
  if (!congestion) {
    return undefined
  }

  const normalized =
    congestion.toLowerCase()

  switch (
    normalized
  ) {
    case "low":
      return "Light traffic"

    case "moderate":
      return "Moderate traffic"

    case "heavy":
      return "Heavy traffic"

    case "severe":
      return "Severe traffic"

    default:
      return undefined
  }
}

/* =========================================================
   DIRECTIONS PANEL
========================================================= */

export function DirectionsPanel({
  isOpen,
  onClose,
  initialDestination,
  onRouteCalculated,
}: DirectionsPanelProps) {
  /* -------------------------------------------------------
     LOCATION STATE
  ------------------------------------------------------- */

  const [origin, setOrigin] =
    useState("")

  const [
    destination,
    setDestination,
  ] = useState("")

  const [
    originCoordinates,
    setOriginCoordinates,
  ] =
    useState<
      [number, number] | null
    >(null)

  const [
    destinationCoordinates,
    setDestinationCoordinates,
  ] =
    useState<
      [number, number] | null
    >(null)

  /* -------------------------------------------------------
     ROUTE STATE
  ------------------------------------------------------- */

  const [
    travelMode,
    setTravelMode,
  ] =
    useState<TravelMode>(
      "driving"
    )

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false)

  const [
    routeInfo,
    setRouteInfo,
  ] =
    useState<RouteInfo | null>(
      null
    )

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  /* -------------------------------------------------------
     VOICE
  ------------------------------------------------------- */

  const [
    voiceEnabled,
    setVoiceEnabled,
  ] =
    useState(true)

  /* -------------------------------------------------------
     LIVE NAVIGATION
  ------------------------------------------------------- */

  const [
    isLiveNavigation,
    setIsLiveNavigation,
  ] =
    useState(false)

  const [
    liveSteps,
    setLiveSteps,
  ] =
    useState<
      {
        instruction: string
        voiceInstruction?: string
        coordinates: [
          number,
          number
        ][]
      }[]
    >([])

  const [
    liveDestination,
    setLiveDestination,
  ] =
    useState<
      [number, number] | null
    >(null)

  /* -------------------------------------------------------
     LIVE NAVIGATION HOOK
  ------------------------------------------------------- */

  const {
    isNavigating,
    position,
    currentStepIndex,
    distanceToDestination,
    navigationMessage,
    gpsError,
    startNavigation,
    stopNavigation,
  } = useLiveNavigation({
    steps:
      liveSteps,

    destination:
      liveDestination,

    enabled:
      isLiveNavigation,
  })

  /* =======================================================
     INITIAL DESTINATION
  ======================================================= */

  useEffect(() => {
    if (!initialDestination) {
      return
    }

    setDestination(
      initialDestination.name
    )

    setDestinationCoordinates([
      initialDestination.lng,
      initialDestination.lat,
    ])

    setRouteInfo(null)
    setError(null)
  }, [
    initialDestination,
  ])

  /* =======================================================
     CLOSE NAVIGATION WHEN PANEL CLOSES
  ======================================================= */

  useEffect(() => {
    if (!isOpen) {
      stopNavigation()
      setIsLiveNavigation(
        false
      )
    }
  }, [
    isOpen,
    stopNavigation,
  ])

  /* =======================================================
     VOICE
  ======================================================= */

  const speak = (
    text: string
  ) => {
    if (!voiceEnabled) {
      return
    }

    if (
      typeof window ===
      "undefined"
    ) {
      return
    }

    if (
      !(
        "speechSynthesis" in
        window
      )
    ) {
      return
    }

    if (!text.trim()) {
      return
    }

    window.speechSynthesis.cancel()

    const utterance =
      new SpeechSynthesisUtterance(
        text
      )

    utterance.lang =
      "en-US"

    utterance.rate =
      0.95

    utterance.pitch =
      1

    utterance.volume =
      1

    window.speechSynthesis.speak(
      utterance
    )
  }

  /* =======================================================
     CURRENT GPS LOCATION
  ======================================================= */

  const handleUseCurrentLocation =
    () => {
      setError(null)

      if (
        typeof navigator ===
          "undefined" ||
        !navigator.geolocation
      ) {
        setError(
          "Location services are not available on this device."
        )

        return
      }

      setOrigin(
        "Finding your location..."
      )

      navigator.geolocation.getCurrentPosition(
        async (
          currentPosition
        ) => {
          const {
            latitude,
            longitude,
          } =
            currentPosition.coords

          /*
           * Store exact GPS coordinates.
           */
          setOriginCoordinates([
            longitude,
            latitude,
          ])

          /*
           * Try reverse geocoding.
           */
          try {
            if (!MAPBOX_TOKEN) {
              throw new Error(
                "Missing Mapbox token."
              )
            }

            const params =
              new URLSearchParams({
                longitude:
                  String(
                    longitude
                  ),

                latitude:
                  String(
                    latitude
                  ),

                limit:
                  "1",

                language:
                  "en",

                access_token:
                  MAPBOX_TOKEN,
              })

            const response =
              await fetch(
                `https://api.mapbox.com/search/geocode/v6/reverse?${params.toString()}`,
                {
                  method:
                    "GET",

                  headers: {
                    Accept:
                      "application/json",
                  },
                }
              )

            if (!response.ok) {
              throw new Error(
                "Reverse geocoding failed."
              )
            }

            const data =
              (await response.json()) as MapboxGeocodingResponse

            const place =
              data.features?.[0]
                ?.place_name

            setOrigin(
              place ||
                "Current Location"
            )
          } catch {
            /*
             * GPS coordinates are still valid.
             */
            setOrigin(
              "Current Location"
            )
          }
        },
        () => {
          setOrigin("")
          setOriginCoordinates(
            null
          )

          setError(
            "Unable to get your current location. Please allow location access."
          )
        },
        {
          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            30000,
        }
      )
    }

  /* =======================================================
     CALCULATE ROUTE
  ======================================================= */

  const calculateRoute =
    async () => {
      if (
        !origin.trim() ||
        !destination.trim()
      ) {
        setError(
          "Please enter both your starting point and destination."
        )

        return
      }

      if (!MAPBOX_TOKEN) {
        setError(
          "Mapbox token is missing. Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to .env.local and restart the development server."
        )

        return
      }

      /*
       * Stop existing navigation.
       */
      stopNavigation()
      setIsLiveNavigation(
        false
      )

      setIsLoading(true)
      setError(null)
      setRouteInfo(null)

      try {
        /* -------------------------------------------------
           ORIGIN
        ------------------------------------------------- */

        const originCoords =
          originCoordinates ||
          (await geocodeLocation(
            origin
          ))

        /* -------------------------------------------------
           DESTINATION
        ------------------------------------------------- */

        const destinationCoords =
          destinationCoordinates ||
          (await geocodeLocation(
            destination
          ))

        /* -------------------------------------------------
           VALIDATE ORIGIN
        ------------------------------------------------- */

        if (!originCoords) {
          throw new Error(
            `Could not find "${origin}". Try a more specific Ghana location, such as "Kwabenya, Accra" or "Madina, Accra".`
          )
        }

        /* -------------------------------------------------
           VALIDATE DESTINATION
        ------------------------------------------------- */

        if (
          !destinationCoords
        ) {
          throw new Error(
            `Could not find "${destination}". Try a more specific Ghana location, such as "Kwabenya, Accra" or "Madina, Accra".`
          )
        }

        /*
         * Save destination for live navigation.
         */
        setLiveDestination(
          destinationCoords
        )

        /*
         * Save resolved coordinates.
         */
        setOriginCoordinates(
          originCoords
        )

        setDestinationCoordinates(
          destinationCoords
        )

        /* -------------------------------------------------
           PROFILE
        ------------------------------------------------- */

        const profile =
          travelMode ===
          "driving"
            ? "mapbox/driving-traffic"
            : travelMode ===
                "walking"
              ? "mapbox/walking"
              : "mapbox/cycling"

        /* -------------------------------------------------
           COORDINATES
        ------------------------------------------------- */

        const coordinates =
          `${originCoords[0]},${originCoords[1]};` +
          `${destinationCoords[0]},${destinationCoords[1]}`

        /* -------------------------------------------------
           PARAMETERS
        ------------------------------------------------- */

        const params =
          new URLSearchParams({
            access_token:
              MAPBOX_TOKEN,

            alternatives:
              "true",

            overview:
              "full",

            geometries:
              "geojson",

            steps:
              "true",

            banner_instructions:
              "true",

            voice_instructions:
              "true",

            voice_units:
              "metric",

            language:
              "en",
          })

        /*
         * Traffic annotations only make sense for driving.
         */
        if (
          travelMode ===
          "driving"
        ) {
          params.set(
            "annotations",
            "distance,duration,speed,congestion,congestion_numeric,closure"
          )
        }

        /* -------------------------------------------------
           ROUTE REQUEST
        ------------------------------------------------- */

        const routeUrl =
          `https://api.mapbox.com/directions/v5/${profile}/${coordinates}?${params.toString()}`

        const response =
          await fetch(
            routeUrl,
            {
              method:
                "GET",

              headers: {
                Accept:
                  "application/json",
              },
            }
          )

        if (!response.ok) {
          let message =
            `Routing request failed (${response.status}).`

          try {
            const body =
              await response.json()

            if (
              body?.message
            ) {
              message =
                body.message
            }
          } catch {
            // Keep default.
          }

          throw new Error(
            message
          )
        }

        const data =
          (await response.json()) as MapboxDirectionsResponse

        /* -------------------------------------------------
           VALIDATE ROUTE
        ------------------------------------------------- */

        if (
          data.code !==
            "Ok" ||
          !data.routes ||
          data.routes.length ===
            0
        ) {
          throw new Error(
            data.message ||
              "Mapbox could not calculate a route between these locations."
          )
        }

        const route =
          data.routes[0]

        /* -------------------------------------------------
           ROUTE GEOMETRY
        ------------------------------------------------- */

        const geometry =
          route.geometry
            ?.coordinates

        if (
          !geometry ||
          geometry.length ===
            0
        ) {
          throw new Error(
            "The route was found, but Mapbox did not return route geometry."
          )
        }

        /*
         * Mapbox returns:
         *
         * [longitude, latitude]
         *
         * Your map callback expects:
         *
         * [latitude, longitude]
         */

        const routeCoordinates =
          geometry.map(
            ([lng, lat]) =>
              [
                lat,
                lng,
              ] as [
                number,
                number
              ]
          )

        onRouteCalculated(
          routeCoordinates
        )

        /* -------------------------------------------------
           BUILD STEPS
        ------------------------------------------------- */

        const steps: RouteStep[] =
          []

        const navigationSteps: {
          instruction: string
          voiceInstruction?: string
          coordinates: [
            number,
            number
          ][]
        }[] = []

        for (const leg of
          route.legs || []) {
          for (const step of
            leg.steps || []) {
            const instruction =
              step.maneuver
                ?.instruction ||
              (step.name
                ? `Continue on ${step.name}`
                : "Continue on road")

            const voiceInstruction =
              step
                .voiceInstructions?.[0]
                ?.announcement

            const congestion =
              step.congestion?.find(
                (
                  value
                ) =>
                  value !==
                    "unknown" &&
                  value !==
                    "unavailable"
              )

            /* ---------------------------------------------
               NORMAL STEP
            --------------------------------------------- */

            steps.push({
              instruction,

              distance:
                formatDistance(
                  step.distance
                ),

              duration:
                formatDuration(
                  step.duration
                ),

              voiceInstruction,

              congestion:
                getTrafficLabel(
                  congestion
                ),
            })

            /* ---------------------------------------------
               LIVE NAVIGATION STEP
            --------------------------------------------- */

            const stepCoordinates =
              step.geometry
                ?.coordinates

            if (
              stepCoordinates &&
              stepCoordinates.length >
                0
            ) {
              navigationSteps.push({
                instruction,

                voiceInstruction,

                coordinates:
                  stepCoordinates,
              })
            }
          }
        }

        /*
         * Save live navigation steps.
         */
        setLiveSteps(
          navigationSteps
        )

        /* -------------------------------------------------
           TRAFFIC
        ------------------------------------------------- */

        const hasTrafficData =
          travelMode ===
          "driving"

        /* -------------------------------------------------
           ROUTE INFO
        ------------------------------------------------- */

        setRouteInfo({
          distance:
            formatDistance(
              route.distance
            ),

          duration:
            formatDuration(
              route.duration
            ),

          steps:
            steps.slice(
              0,
              30
            ),

          hasTrafficData,

          trafficDuration:
            hasTrafficData
              ? formatDuration(
                  route.duration
                )
              : undefined,
        })

        /* -------------------------------------------------
           FIRST VOICE INSTRUCTION
        ------------------------------------------------- */

        if (
          voiceEnabled &&
          steps[0]
            ?.voiceInstruction
        ) {
          speak(
            steps[0]
              .voiceInstruction
          )
        }
      } catch (err) {
        console.error(
          "Lincoln Navigation route calculation error:",
          err
        )

        setError(
          err instanceof Error
            ? err.message
            : "Unable to calculate route."
        )
      } finally {
        setIsLoading(false)
      }
    }

  /* =======================================================
     START LIVE NAVIGATION
  ======================================================= */

  const handleStartLiveNavigation =
    () => {
      setError(null)

      if (
        !liveDestination
      ) {
        setError(
          "Destination coordinates are missing. Please calculate the route again."
        )

        return
      }

      if (
        liveSteps.length ===
        0
      ) {
        setError(
          "Live navigation data is not available. Please calculate the route again."
        )

        return
      }

      setIsLiveNavigation(
        true
      )

      /*
       * Allow React state to update before
       * starting GPS navigation.
       */
      window.setTimeout(() => {
        startNavigation()
      }, 100)
    }

  /* =======================================================
     STOP LIVE NAVIGATION
  ======================================================= */

  const handleStopLiveNavigation =
    () => {
      stopNavigation()
      setIsLiveNavigation(
        false
      )
    }

  /* =======================================================
     SWAP LOCATIONS
  ======================================================= */

  const swapLocations =
    () => {
      const previousOrigin =
        origin

      const previousOriginCoordinates =
        originCoordinates

      setOrigin(
        destination
      )

      setOriginCoordinates(
        destinationCoordinates
      )

      setDestination(
        previousOrigin
      )

      setDestinationCoordinates(
        previousOriginCoordinates
      )

      setRouteInfo(null)

      setLiveSteps([])

      setLiveDestination(
        null
      )

      stopNavigation()

      setIsLiveNavigation(
        false
      )

      setError(null)
    }

  /* =======================================================
     VOICE STEP
  ======================================================= */

  const handleVoiceStep =
    (
      step: RouteStep
    ) => {
      speak(
        step.voiceInstruction ||
          step.instruction
      )
    }

  /* =======================================================
     CLOSE
  ======================================================= */

  const handleClose = () => {
    stopNavigation()

    setIsLiveNavigation(
      false
    )

    onClose()
  }

  /* =======================================================
     CLOSED
  ======================================================= */

  if (!isOpen) {
    return null
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-[400px] bg-card/95 backdrop-blur-xl z-[1001] border-r border-border flex flex-col">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="p-4 border-b border-border">

        <div className="flex items-center justify-between mb-4">

          <h2 className="text-lg font-semibold">
            Directions
          </h2>

          <div className="flex items-center gap-1">

            {/* VOICE */}

            <button
              type="button"
              onClick={() =>
                setVoiceEnabled(
                  (value) =>
                    !value
                )
              }
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label={
                voiceEnabled
                  ? "Disable voice directions"
                  : "Enable voice directions"
              }
              title={
                voiceEnabled
                  ? "Disable voice directions"
                  : "Enable voice directions"
              }
            >
              {voiceEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>

            {/* CLOSE */}

            <button
              type="button"
              onClick={
                handleClose
              }
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Close directions"
            >
              <X className="w-5 h-5" />
            </button>

          </div>
        </div>

        {/* =================================================
            TRAVEL MODES
        ================================================= */}

        <div className="flex gap-2 mb-4">

          {[
            {
              mode:
                "driving" as const,
              icon: Car,
              label: "Drive",
            },
            {
              mode:
                "walking" as const,
              icon: Footprints,
              label: "Walk",
            },
            {
              mode:
                "cycling" as const,
              icon: Bike,
              label: "Bike",
            },
          ].map(
            ({
              mode,
              icon: Icon,
              label,
            }) => (
              <button
                type="button"
                key={mode}
                onClick={() => {
                  setTravelMode(
                    mode
                  )

                  setRouteInfo(
                    null
                  )

                  setLiveSteps(
                    []
                  )

                  setLiveDestination(
                    null
                  )

                  stopNavigation()

                  setIsLiveNavigation(
                    false
                  )

                  setError(null)
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors",

                  travelMode ===
                    mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />

                <span className="text-sm font-medium">
                  {label}
                </span>
              </button>
            )
          )}

        </div>

        {/* =================================================
            LOCATION INPUTS
        ================================================= */}

        <div className="space-y-3">

          {/* ORIGIN */}

          <div className="relative">

            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />

            <Input
              placeholder="Starting point"
              value={origin}
              onChange={(
                event
              ) => {
                setOrigin(
                  event.target
                    .value
                )

                setOriginCoordinates(
                  null
                )

                setError(null)
              }}
              className="pl-8 pr-10 bg-secondary border-0"
            />

            <button
              type="button"
              onClick={
                handleUseCurrentLocation
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              title="Use current location"
              aria-label="Use current location"
            >
              <LocateFixed className="w-4 h-4 text-muted-foreground" />
            </button>

          </div>

          {/* SWAP */}

          <div className="flex items-center gap-2">

            <div className="flex-1 h-px bg-border" />

            <button
              type="button"
              onClick={
                swapLocations
              }
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              title="Swap locations"
              aria-label="Swap locations"
            >
              <ArrowRight className="w-4 h-4 rotate-90" />
            </button>

            <div className="flex-1 h-px bg-border" />

          </div>

          {/* DESTINATION */}

          <div className="relative">

            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />

            <Input
              placeholder="Destination"
              value={
                destination
              }
              onChange={(
                event
              ) => {
                setDestination(
                  event.target
                    .value
                )

                setDestinationCoordinates(
                  null
                )

                setError(null)
              }}
              className="pl-8 bg-secondary border-0"
            />

          </div>

          {/* GET DIRECTIONS */}

          <Button
            type="button"
            onClick={
              calculateRoute
            }
            className="w-full bg-primary hover:bg-primary/90"
            disabled={
              isLoading ||
              isNavigating
            }
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

          {/* START LIVE NAVIGATION */}

          {routeInfo && (
            <Button
              type="button"
              onClick={
                handleStartLiveNavigation
              }
              disabled={
                isNavigating ||
                liveSteps.length ===
                  0
              }
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

          {/* STOP LIVE NAVIGATION */}

          {isNavigating && (
            <Button
              type="button"
              variant="outline"
              onClick={
                handleStopLiveNavigation
              }
              className="w-full"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Live Navigation
            </Button>
          )}

          {/* ERROR */}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ===================================================
          ROUTE CONTENT
      =================================================== */}

      {routeInfo && (
        <ScrollArea className="flex-1">

          {/* LIVE NAVIGATION */}

          {isNavigating && (
            <div className="mx-4 mt-4 rounded-xl bg-primary text-primary-foreground p-4 shadow-lg">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">

                  <Navigation className="w-5 h-5 animate-pulse" />

                </div>

                <div className="flex-1">

                  <p className="text-xs opacity-80 uppercase tracking-wide">
                    Live Navigation
                  </p>

                  <p className="font-semibold">
                    {navigationMessage ||
                      "Following route..."}
                  </p>

                </div>

              </div>

              {/* DISTANCE */}

              {distanceToDestination !==
                null && (
                <div className="mt-3 text-sm opacity-90">
                  {distanceToDestination <=
                  1000
                    ? `${Math.round(
                        distanceToDestination
                      )} m`
                    : `${(
                        distanceToDestination /
                        1000
                      ).toFixed(
                        1
                      )} km`}{" "}
                  to destination
                </div>
              )}

              {/* GPS */}

              {position && (
                <div className="mt-2 text-xs opacity-70">
                  GPS accuracy:{" "}
                  {Math.round(
                    position.accuracy
                  )}
                  m
                </div>
              )}

              {/* CURRENT STEP */}

              {liveSteps[
                currentStepIndex
              ] && (
                <div className="mt-3 rounded-lg bg-white/10 p-3">

                  <p className="text-xs opacity-70">
                    NEXT INSTRUCTION
                  </p>

                  <p className="text-sm font-medium mt-1">
                    {
                      liveSteps[
                        currentStepIndex
                      ].instruction
                    }
                  </p>

                </div>
              )}

              {/* GPS ERROR */}

              {gpsError && (
                <div className="mt-3 rounded-lg bg-black/10 p-2 text-xs">
                  {gpsError}
                </div>
              )}

            </div>
          )}

          {/* NORMAL ROUTE */}

          <div className="p-4">

            {/* SUMMARY */}

            <div className="bg-secondary rounded-xl p-4 mb-4">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-2xl font-bold text-foreground">
                    {
                      routeInfo.duration
                    }
                  </p>

                  <p className="text-muted-foreground">
                    {
                      routeInfo.distance
                    }
                  </p>

                  {routeInfo.hasTrafficData && (
                    <div className="flex items-center gap-1.5 mt-2">

                      <TrafficCone className="w-4 h-4 text-primary" />

                      <span className="text-xs text-muted-foreground">
                        Traffic-aware ETA
                      </span>

                    </div>
                  )}

                </div>

                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">

                  {travelMode ===
                  "driving" ? (
                    <Car className="w-6 h-6 text-primary" />
                  ) : travelMode ===
                    "walking" ? (
                    <Footprints className="w-6 h-6 text-primary" />
                  ) : (
                    <Bike className="w-6 h-6 text-primary" />
                  )}

                </div>

              </div>

            </div>

            {/* TURN BY TURN */}

            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Turn-by-turn
            </h3>

            <div className="space-y-2">

              {routeInfo.steps.map(
                (
                  step,
                  index
                ) => (
                  <button
                    key={`${index}-${step.instruction}`}
                    type="button"
                    onClick={() =>
                      handleVoiceStep(
                        step
                      )
                    }
                    className={cn(
                      "w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors",

                      isNavigating &&
                        index ===
                          currentStepIndex
                        ? "bg-primary/15 ring-1 ring-primary/30"
                        : "bg-secondary/50 hover:bg-secondary"
                    )}
                  >

                    {/* NUMBER */}

                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">

                      <span className="text-xs font-medium text-primary">
                        {index + 1}
                      </span>

                    </div>

                    {/* CONTENT */}

                    <div className="flex-1 min-w-0">

                      <p className="text-sm text-foreground">
                        {
                          step.instruction
                        }
                      </p>

                      <div className="flex items-center gap-2 mt-1">

                        <p className="text-xs text-muted-foreground">
                          {
                            step.distance
                          }
                        </p>

                        <span className="text-muted-foreground">
                          •
                        </span>

                        <p className="text-xs text-muted-foreground">
                          {
                            step.duration
                          }
                        </p>

                      </div>

                      {step.congestion && (
                        <p
                          className={cn(
                            "text-xs mt-1 font-medium",

                            step.congestion ===
                              "Light traffic" &&
                              "text-green-600",

                            step.congestion ===
                              "Moderate traffic" &&
                              "text-yellow-600",

                            step.congestion ===
                              "Heavy traffic" &&
                              "text-orange-600",

                            step.congestion ===
                              "Severe traffic" &&
                              "text-red-600"
                          )}
                        >
                          {
                            step.congestion
                          }
                        </p>
                      )}

                    </div>

                    {/* VOICE */}

                    <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />

                  </button>
                )
              )}

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