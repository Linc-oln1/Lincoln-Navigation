"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import type { TravelMode } from "@/lib/routing"

/* =========================================================
   TYPES
========================================================= */

export interface LiveNavigationStep {
  instruction: string
  voiceInstruction?: string
  coordinates: [number, number][]
}

interface UseLiveNavigationOptions {
  steps: LiveNavigationStep[]
  destination: [number, number] | null
  enabled?: boolean
  onRerouteNeeded?: () => void
  // Which vehicle the live ETA's fallback speed (used whenever a
  // fresh GPS speed reading isn't available — see
  // DEFAULT_SPEEDS_METERS_PER_SECOND below) should assume. Defaults
  // to "driving" so callers that don't pass this keep working
  // exactly as before.
  travelMode?: TravelMode
}

interface NavigationPosition {
  latitude: number
  longitude: number
  accuracy: number
  speed: number | null
  heading: number | null
}

interface GeolocationErrorInfo {
  code: number
  message?: string
}

/* =========================================================
   CONSTANTS
========================================================= */

const EARTH_RADIUS_METERS = 6371000

/*
 * Distance at which we consider the user to have arrived.
 */
const ARRIVAL_DISTANCE_METERS = 35

/*
 * Distance before a maneuver where we announce
 * the upcoming instruction.
 */
const MANEUVER_WARNING_DISTANCE_METERS = 150

/*
 * Distance at which we consider the user potentially
 * off the route.
 */
const OFF_ROUTE_DISTANCE_METERS = 80

/*
 * Minimum amount of time between reroute requests.
 */
const REROUTE_COOLDOWN_MS = 15000

/*
 * GPS settings.
 */
const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 2000,
}

/*
 * LIVE ETA
 *
 * The browser's GPS speed reading (position.coords.speed, m/s) is
 * the best available signal for "how fast is this person actually
 * moving right now" — but it's frequently null (many devices don't
 * report it at all until the fix is very confident) or momentarily
 * zero/noisy (stopped at a light, weak signal indoors). Falling
 * back to 0 in either case would make the ETA either disappear or
 * spike to infinity every few seconds, which is worse than useless.
 *
 * These are the fallback speeds used whenever a confident live
 * reading isn't available, and are also the floor blended in via
 * EMA smoothing below — realistic urban Ghana averages per mode,
 * not open-road maximums.
 */
const DEFAULT_SPEEDS_METERS_PER_SECOND: Record<TravelMode, number> = {
  driving: 10.5, // ~38 km/h — city driving with real traffic
  "driving-traffic": 10.5,
  motorcycle: 12.5, // ~45 km/h — okada/lane-filtering moves faster than cars
  bus: 7, // ~25 km/h — trotro/bus stops, indirect routing
  walking: 1.35, // ~4.9 km/h
  cycling: 4.2, // ~15 km/h
}

/*
 * A live GPS speed reading below this is treated as "not moving /
 * not a confident reading" rather than blended into the smoothed
 * speed — otherwise a momentary stop at every junction would drag
 * the smoothed speed toward zero and make the ETA spike upward each
 * time, even though the trip is clearly still progressing overall.
 */
const MIN_CONFIDENT_SPEED_MPS = 0.5

/*
 * Exponential-moving-average weight given to each new GPS speed
 * reading. Low enough that a couple of noisy samples (a GPS glitch,
 * a brief stop) don't swing the live ETA around, high enough that a
 * genuine, sustained speed change (leaving a highway, hitting
 * traffic) is reflected within a few update cycles.
 */
const SPEED_SMOOTHING_FACTOR = 0.3

/* =========================================================
   GEO HELPERS
========================================================= */

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI
}

/*
 * Coordinates are always:
 *
 * [longitude, latitude]
 */
function distanceBetween(
  a: [number, number],
  b: [number, number]
): number {
  const lat1 = toRadians(a[1])
  const lat2 = toRadians(b[1])

  const deltaLat = toRadians(b[1] - a[1])
  const deltaLng = toRadians(b[0] - a[0])

  const value =
    Math.sin(deltaLat / 2) *
      Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2)

  const clamped = Math.min(
    1,
    Math.max(0, value)
  )

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(clamped),
      Math.sqrt(1 - clamped)
    )

  return EARTH_RADIUS_METERS * angularDistance
}

/*
 * Convert longitude/latitude to a local meter coordinate system.
 *
 * This is useful for calculating distance from a GPS point
 * to a route line segment.
 */
function projectToMeters(
  coordinate: [number, number],
  referenceLatitude: number
): [number, number] {
  const longitude =
    coordinate[0]

  const latitude =
    coordinate[1]

  const latitudeRadians =
    toRadians(referenceLatitude)

  const metersPerDegreeLatitude =
    111320

  const metersPerDegreeLongitude =
    111320 *
    Math.cos(latitudeRadians)

  return [
    longitude *
      metersPerDegreeLongitude,

    latitude *
      metersPerDegreeLatitude,
  ]
}

/*
 * Calculate the minimum distance from a point to a line
 * segment using a local planar approximation.
 */
function distancePointToSegment(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): number {
  const referenceLatitude =
    point[1]

  const p =
    projectToMeters(
      point,
      referenceLatitude
    )

  const a =
    projectToMeters(
      segmentStart,
      referenceLatitude
    )

  const b =
    projectToMeters(
      segmentEnd,
      referenceLatitude
    )

  const dx = b[0] - a[0]
  const dy = b[1] - a[1]

  const segmentLengthSquared =
    dx * dx + dy * dy

  /*
   * Degenerate segment.
   */
  if (
    segmentLengthSquared === 0
  ) {
    return Math.sqrt(
      Math.pow(
        p[0] - a[0],
        2
      ) +
        Math.pow(
          p[1] - a[1],
          2
        )
    )
  }

  const t =
    ((p[0] - a[0]) * dx +
      (p[1] - a[1]) * dy) /
    segmentLengthSquared

  const clampedT =
    Math.max(
      0,
      Math.min(1, t)
    )

  const closestX =
    a[0] + clampedT * dx

  const closestY =
    a[1] + clampedT * dy

  return Math.sqrt(
    Math.pow(
      p[0] - closestX,
      2
    ) +
      Math.pow(
        p[1] - closestY,
        2
      )
  )
}

/*
 * Find the shortest distance from the user's position
 * to a route geometry.
 */
function distanceToRoute(
  position: [number, number],
  coordinates: [number, number][]
): number {
  if (
    coordinates.length === 0
  ) {
    return Infinity
  }

  if (
    coordinates.length === 1
  ) {
    return distanceBetween(
      position,
      coordinates[0]
    )
  }

  let minimumDistance =
    Infinity

  for (
    let index = 0;
    index <
    coordinates.length - 1;
    index += 1
  ) {
    const distance =
      distancePointToSegment(
        position,
        coordinates[index],
        coordinates[index + 1]
      )

    if (
      distance <
      minimumDistance
    ) {
      minimumDistance =
        distance
    }
  }

  return minimumDistance
}

/*
 * Where along a segment the user's position actually projects to —
 * the same math as distancePointToSegment above, but returning the
 * point itself (interpolated in lng/lat) instead of just the
 * distance to it. Used to measure the REMAINING distance from that
 * projected point onward, rather than only how far off the route
 * the user currently is.
 */
function closestPointOnSegment(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): [number, number] {
  const referenceLatitude = point[1]

  const p = projectToMeters(point, referenceLatitude)
  const a = projectToMeters(segmentStart, referenceLatitude)
  const b = projectToMeters(segmentEnd, referenceLatitude)

  const dx = b[0] - a[0]
  const dy = b[1] - a[1]

  const segmentLengthSquared = dx * dx + dy * dy

  if (segmentLengthSquared === 0) {
    return segmentStart
  }

  const t =
    ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) /
    segmentLengthSquared

  const clampedT = Math.max(0, Math.min(1, t))

  return [
    segmentStart[0] + clampedT * (segmentEnd[0] - segmentStart[0]),
    segmentStart[1] + clampedT * (segmentEnd[1] - segmentStart[1]),
  ]
}

/*
 * Distance remaining ALONG THE ROAD from the user's current
 * position to the end of the route — not the straight-line
 * distance to the destination (which distanceToDestination
 * computes, and which cuts straight through blocks/rivers/hills on
 * anything but a dead-straight road). This is what a live ETA
 * should actually be divided by: it finds where on the current
 * step's polyline the user's position projects to, adds the
 * distance from there to the end of that step, then adds the full
 * length of every step after it.
 */
function remainingRouteDistanceMeters(
  position: [number, number],
  steps: LiveNavigationStep[],
  stepIndex: number
): number {
  if (stepIndex >= steps.length) {
    return 0
  }

  let remaining = 0

  const currentStep = steps[stepIndex]
  const coordinates = currentStep.coordinates

  if (coordinates.length === 1) {
    remaining += distanceBetween(position, coordinates[0])
  } else if (coordinates.length > 1) {
    let closestSegmentIndex = 0
    let closestDistance = Infinity

    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const distance = distancePointToSegment(
        position,
        coordinates[index],
        coordinates[index + 1]
      )

      if (distance < closestDistance) {
        closestDistance = distance
        closestSegmentIndex = index
      }
    }

    const closestPoint = closestPointOnSegment(
      position,
      coordinates[closestSegmentIndex],
      coordinates[closestSegmentIndex + 1]
    )

    // From the projected point to the end of the segment it's on...
    remaining += distanceBetween(
      closestPoint,
      coordinates[closestSegmentIndex + 1]
    )

    // ...plus every full segment remaining in this step.
    for (
      let index = closestSegmentIndex + 1;
      index < coordinates.length - 1;
      index += 1
    ) {
      remaining += distanceBetween(
        coordinates[index],
        coordinates[index + 1]
      )
    }
  }

  // Plus the full length of every step after the current one.
  for (let step = stepIndex + 1; step < steps.length; step += 1) {
    const stepCoordinates = steps[step].coordinates

    for (
      let index = 0;
      index < stepCoordinates.length - 1;
      index += 1
    ) {
      remaining += distanceBetween(
        stepCoordinates[index],
        stepCoordinates[index + 1]
      )
    }
  }

  return remaining
}

/* =========================================================
   BEARING
========================================================= */

function calculateBearing(
  from: [number, number],
  to: [number, number]
): number {
  const latitude1 =
    toRadians(from[1])

  const latitude2 =
    toRadians(to[1])

  const deltaLongitude =
    toRadians(
      to[0] - from[0]
    )

  const y =
    Math.sin(deltaLongitude) *
    Math.cos(latitude2)

  const x =
    Math.cos(latitude1) *
      Math.sin(latitude2) -
    Math.sin(latitude1) *
      Math.cos(latitude2) *
      Math.cos(deltaLongitude)

  const bearing =
    toDegrees(
      Math.atan2(y, x)
    )

  return (
    bearing + 360
  ) % 360
}

/* =========================================================
   VOICE
========================================================= */

function speakNavigation(
  text: string
): void {
  if (
    !text ||
    typeof window === "undefined"
  ) {
    return
  }

  if (
    !("speechSynthesis" in window)
  ) {
    return
  }

  try {
    window.speechSynthesis.cancel()

    const utterance =
      new SpeechSynthesisUtterance(
        text
      )

    utterance.lang = "en-US"
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1

    window.speechSynthesis.speak(
      utterance
    )
  } catch (error) {
    console.warn(
      "Lincoln Navigation voice error:",
      error
    )
  }
}

/* =========================================================
   GPS ERROR HANDLING
========================================================= */

function getGpsErrorMessage(
  error: GeolocationPositionError
): string {
  /*
   * Do not rely on JSON.stringify(error).
   *
   * Browser GeolocationPositionError objects often
   * appear as {} when logged as normal objects.
   *
   * DEFENSIVE: `error` isn't always a real, well-formed
   * GeolocationPositionError. Some browsers/embedded contexts
   * (a Permissions-Policy that blocks "geolocation" outright, an
   * insecure/non-HTTPS origin, geolocation disabled at the OS
   * level, or the call happening inside an iframe without
   * allow="geolocation") invoke the error callback with an object
   * that has no `code` at all — that used to fall through to the
   * generic "Unable to receive..." message with no indication of
   * *why*, which is exactly the unhelpful case this function
   * previously couldn't distinguish from a normal timeout.
   */
  switch (error?.code) {
    case error?.PERMISSION_DENIED:
      return (
        "Location permission was denied. " +
        "Please allow location access for localhost:3000 " +
        "in your browser settings and try again."
      )

    case error?.POSITION_UNAVAILABLE:
      return (
        "Your current GPS position is unavailable. " +
        "Make sure Location Services are enabled and try again."
      )

    case error?.TIMEOUT:
      return (
        "GPS location timed out. " +
        "Please wait a moment and try again."
      )

    default:
      return (
        "Unable to receive your current GPS location. " +
        "If this keeps happening, location access may be blocked " +
        "for this page (check your browser's site settings) or " +
        "unavailable in this environment."
      )
  }
}

function logGpsError(
  context: string,
  error: GeolocationPositionError
): void {
  /*
   * DEFENSIVE + DOWNGRADED TO warn:
   *
   * This fires for expected, already-handled runtime conditions
   * (permission denied, GPS unavailable, timeout) — not a code
   * defect — and Next.js's dev overlay treats any console.error()
   * call as a blocking "Console Error" report. Using console.warn
   * keeps this visible in the console for debugging without
   * surfacing a red-screen overlay for something the UI already
   * shows the user a proper message for (see setGpsError below).
   *
   * `error?.code`/`error?.message` guard against the object not
   * being a real GeolocationPositionError at all (see the comment
   * in getGpsErrorMessage above) — previously this logged a bare
   * `{}` with zero information about what actually went wrong.
   */
  console.warn(
    `Lincoln Navigation GPS error (${context}):`,
    {
      code: error?.code ?? "unknown",
      message:
        error?.message ||
        "No message provided by the browser — this can happen " +
          "when geolocation is blocked by a permissions policy, " +
          "the page isn't served over a secure origin, or " +
          "location access is disabled at the OS level.",
    }
  )
}

/* =========================================================
   HOOK
========================================================= */

export function useLiveNavigation({
  steps,
  destination,
  enabled = false,
  onRerouteNeeded,
  travelMode = "driving",
}: UseLiveNavigationOptions) {
  /* =======================================================
     REFS
  ======================================================= */

  const watchIdRef =
    useRef<number | null>(null)

  const currentStepRef =
    useRef(0)

  const stepsRef =
    useRef<
      LiveNavigationStep[]
    >([])

  const destinationRef =
    useRef<
      [number, number] | null
    >(null)

  const rerouteCooldownRef =
    useRef(0)

  const announced150Ref =
    useRef<Set<number>>(
      new Set()
    )

  const announcedTurnRef =
    useRef<Set<number>>(
      new Set()
    )

  const hasAnnouncedArrivalRef =
    useRef(false)

  const isStartingRef =
    useRef(false)

  const travelModeRef =
    useRef<TravelMode>(travelMode)

  /*
   * Smoothed (EMA) live GPS speed in meters/second, used for the
   * live ETA. null until at least one confident reading has come
   * in — see DEFAULT_SPEEDS_METERS_PER_SECOND above for what's used
   * before that / whenever a reading isn't confident.
   */
  const smoothedSpeedRef =
    useRef<number | null>(null)

  /*
   * Prevent repeated voice messages from being
   * triggered by noisy GPS updates.
   */
  const lastSpokenMessageRef =
    useRef<string | null>(null)

  const lastSpokenTimeRef =
    useRef(0)

  /* =======================================================
     STATE
  ======================================================= */

  const [
    isNavigating,
    setIsNavigating,
  ] = useState(false)

  const [
    position,
    setPosition,
  ] =
    useState<NavigationPosition | null>(
      null
    )

  const [
    currentStepIndex,
    setCurrentStepIndex,
  ] = useState(0)

  const [
    distanceToDestination,
    setDistanceToDestination,
  ] =
    useState<number | null>(
      null
    )

  const [
    navigationMessage,
    setNavigationMessage,
  ] =
    useState<string | null>(
      null
    )

  const [
    gpsError,
    setGpsError,
  ] =
    useState<string | null>(
      null
    )

  /*
   * LIVE ETA — seconds remaining at the current (or, absent a
   * confident reading, mode-typical) speed, recalculated on every
   * GPS update in processGpsPosition below. null until the first
   * update after startNavigation().
   */
  const [
    etaSeconds,
    setEtaSeconds,
  ] =
    useState<number | null>(
      null
    )

  /*
   * Wall-clock estimated arrival time (Date.now() + etaSeconds),
   * recomputed alongside etaSeconds. Exposed as a Date so callers
   * can format it however they like (e.g. toLocaleTimeString).
   */
  const [
    arrivalTime,
    setArrivalTime,
  ] =
    useState<Date | null>(
      null
    )

  /* =======================================================
     SYNCHRONIZE REFS
  ======================================================= */

  useEffect(() => {
    travelModeRef.current =
      travelMode
  }, [travelMode])

  useEffect(() => {
    stepsRef.current =
      steps || []

    /*
     * If a completely new route is supplied,
     * reset the step index.
     */
    if (
      stepsRef.current.length === 0
    ) {
      currentStepRef.current = 0
      setCurrentStepIndex(0)
    }
  }, [steps])

  useEffect(() => {
    destinationRef.current =
      destination
  }, [destination])

  /* =======================================================
     SAFE SPEECH
  ======================================================= */

  const speakMessage = useCallback(
    (message: string) => {
      if (!message) {
        return
      }

      const now = Date.now()

      /*
       * Don't repeatedly speak exactly the same
       * instruction within 5 seconds.
       */
      if (
        lastSpokenMessageRef.current ===
          message &&
        now -
          lastSpokenTimeRef.current <
          5000
      ) {
        return
      }

      lastSpokenMessageRef.current =
        message

      lastSpokenTimeRef.current =
        now

      speakNavigation(message)
    },
    []
  )

  /* =======================================================
     STOP NAVIGATION
  ======================================================= */

  const stopNavigation =
    useCallback(() => {
      if (
        watchIdRef.current !==
          null &&
        typeof navigator !==
          "undefined" &&
        navigator.geolocation
      ) {
        try {
          navigator.geolocation.clearWatch(
            watchIdRef.current
          )
        } catch (error) {
          console.warn(
            "Lincoln Navigation could not clear GPS watcher:",
            error
          )
        }

        watchIdRef.current =
          null
      }

      if (
        typeof window !==
          "undefined" &&
        "speechSynthesis" in
          window
      ) {
        try {
          window.speechSynthesis.cancel()
        } catch {
          // Ignore speech cancellation errors.
        }
      }

      isStartingRef.current =
        false

      smoothedSpeedRef.current =
        null

      setIsNavigating(false)

      setNavigationMessage(
        null
      )
    }, [])

  /* =======================================================
     PROCESS GPS POSITION
  ======================================================= */

  const processGpsPosition =
    useCallback(
      (
        gpsPosition: GeolocationPosition
      ) => {
        const {
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
        } =
          gpsPosition.coords

        /*
         * Mapbox coordinates:
         *
         * [longitude, latitude]
         */
        const currentPosition: [
          number,
          number
        ] = [
          longitude,
          latitude,
        ]

        setPosition({
          latitude,
          longitude,
          accuracy,
          speed:
            speed !== null &&
            Number.isFinite(speed)
              ? speed
              : null,
          heading:
            heading !== null &&
            Number.isFinite(heading)
              ? heading
              : null,
        })

        setGpsError(null)

        /* ---------------------------------------------------
           DESTINATION
        --------------------------------------------------- */

        const routeDestination =
          destinationRef.current

        if (
          !routeDestination
        ) {
          return
        }

        const destinationDistance =
          distanceBetween(
            currentPosition,
            routeDestination
          )

        setDistanceToDestination(
          destinationDistance
        )

        /* ---------------------------------------------------
           ARRIVAL
        --------------------------------------------------- */

        if (
          destinationDistance <=
          ARRIVAL_DISTANCE_METERS
        ) {
          if (
            !hasAnnouncedArrivalRef.current
          ) {
            hasAnnouncedArrivalRef.current =
              true

            const message =
              "You have arrived at your destination."

            setNavigationMessage(
              message
            )

            speakMessage(
              message
            )
          }

          stopNavigation()

          return
        }

        /*
         * Reset arrival protection if the user moves
         * away from the destination.
         */
        hasAnnouncedArrivalRef.current =
          false

        /* ---------------------------------------------------
           ROUTE STEPS
        --------------------------------------------------- */

        const routeSteps =
          stepsRef.current

        if (
          routeSteps.length === 0
        ) {
          setNavigationMessage(
            "GPS connected. Waiting for route instructions..."
          )

          return
        }

        let stepIndex =
          currentStepRef.current

        if (
          stepIndex >=
          routeSteps.length
        ) {
          stepIndex =
            routeSteps.length - 1

          currentStepRef.current =
            stepIndex

          setCurrentStepIndex(
            stepIndex
          )
        }

        const currentStep =
          routeSteps[stepIndex]

        if (
          !currentStep ||
          !currentStep.coordinates ||
          currentStep.coordinates
            .length === 0
        ) {
          return
        }

        /* ---------------------------------------------------
           LIVE ETA

           Recalculated on every GPS update from two live inputs:
           how far is actually left to travel along the road (not
           a straight line to the destination — see
           remainingRouteDistanceMeters), and how fast the user is
           actually moving right now (their own smoothed GPS speed
           when it's a confident reading, otherwise a realistic
           mode-typical average — see DEFAULT_SPEEDS_METERS_PER_SECOND
           above for why a raw 0 or null speed is never divided by
           directly).
        --------------------------------------------------- */

        const rawSpeed =
          speed !== null && Number.isFinite(speed)
            ? speed
            : null

        if (
          rawSpeed !== null &&
          rawSpeed >= MIN_CONFIDENT_SPEED_MPS
        ) {
          smoothedSpeedRef.current =
            smoothedSpeedRef.current === null
              ? rawSpeed
              : smoothedSpeedRef.current *
                  (1 - SPEED_SMOOTHING_FACTOR) +
                rawSpeed * SPEED_SMOOTHING_FACTOR
        }

        const fallbackSpeed =
          DEFAULT_SPEEDS_METERS_PER_SECOND[
            travelModeRef.current
          ] ?? DEFAULT_SPEEDS_METERS_PER_SECOND.driving

        const effectiveSpeed =
          smoothedSpeedRef.current !== null
            ? Math.max(
                smoothedSpeedRef.current,
                MIN_CONFIDENT_SPEED_MPS
              )
            : fallbackSpeed

        const remainingDistance =
          remainingRouteDistanceMeters(
            currentPosition,
            routeSteps,
            stepIndex
          )

        const nextEtaSeconds =
          remainingDistance / effectiveSpeed

        setEtaSeconds(nextEtaSeconds)

        setArrivalTime(
          new Date(
            Date.now() + nextEtaSeconds * 1000
          )
        )

        /* ---------------------------------------------------
           MANEUVER POINT
        --------------------------------------------------- */

        const maneuverPoint =
          currentStep.coordinates[
            currentStep.coordinates.length -
              1
          ]

        const distanceToManeuver =
          distanceBetween(
            currentPosition,
            maneuverPoint
          )

        /* ---------------------------------------------------
           ROUTE DISTANCE
        --------------------------------------------------- */

        /*
         * Check the user's actual distance from the route,
         * rather than distance to the next maneuver.
         *
         * This prevents a perfectly valid driver from being
         * marked "off route" simply because the next turn
         * is several hundred meters away.
         */
        const routeDistance =
          distanceToRoute(
            currentPosition,
            currentStep.coordinates
          )

        /* ---------------------------------------------------
           OFF ROUTE
        --------------------------------------------------- */

        if (
          routeDistance >
          OFF_ROUTE_DISTANCE_METERS
        ) {
          const now =
            Date.now()

          if (
            now -
              rerouteCooldownRef.current >
            REROUTE_COOLDOWN_MS
          ) {
            rerouteCooldownRef.current =
              now

            const message =
              "You appear to be off route. Recalculating..."

            setNavigationMessage(
              message
            )

            speakMessage(
              message
            )

            if (
              onRerouteNeeded
            ) {
              onRerouteNeeded()
            }
          }
        }

        /* ---------------------------------------------------
           150-METER WARNING
        --------------------------------------------------- */

        if (
          distanceToManeuver <=
            MANEUVER_WARNING_DISTANCE_METERS &&
          distanceToManeuver >
            ARRIVAL_DISTANCE_METERS &&
          !announced150Ref.current.has(
            stepIndex
          )
        ) {
          announced150Ref.current.add(
            stepIndex
          )

          const instruction =
            currentStep.voiceInstruction ||
            currentStep.instruction

          const roundedDistance =
            Math.max(
              1,
              Math.round(
                distanceToManeuver
              )
            )

          const warning =
            `In approximately ${roundedDistance} meters, ${instruction}`

          setNavigationMessage(
            warning
          )

          speakMessage(
            warning
          )
        }

        /* ---------------------------------------------------
           MANEUVER
        --------------------------------------------------- */

        if (
          distanceToManeuver <=
            ARRIVAL_DISTANCE_METERS &&
          !announcedTurnRef.current.has(
            stepIndex
          )
        ) {
          announcedTurnRef.current.add(
            stepIndex
          )

          const instruction =
            currentStep.voiceInstruction ||
            currentStep.instruction

          setNavigationMessage(
            instruction
          )

          speakMessage(
            instruction
          )

          /*
           * Advance to the next step.
           */
          if (
            stepIndex <
            routeSteps.length - 1
          ) {
            const nextStepIndex =
              stepIndex + 1

            currentStepRef.current =
              nextStepIndex

            setCurrentStepIndex(
              nextStepIndex
            )

            /*
             * Announce the next instruction if available.
             */
            const nextStep =
              routeSteps[
                nextStepIndex
              ]

            if (
              nextStep
                ?.voiceInstruction
            ) {
              /*
               * Do not immediately speak twice.
               * The 150m warning will handle the next step.
               */
            }
          }
        }

        /* ---------------------------------------------------
           DEFAULT NAVIGATION MESSAGE
        --------------------------------------------------- */

        if (
          distanceToManeuver >
            MANEUVER_WARNING_DISTANCE_METERS &&
          routeDistance <=
            OFF_ROUTE_DISTANCE_METERS
        ) {
          setNavigationMessage(
            currentStep.instruction
          )
        }
      },
      [
        onRerouteNeeded,
        speakMessage,
        stopNavigation,
      ]
    )

  /* =======================================================
     HANDLE GPS ERROR
  ======================================================= */

  const handleGpsError =
    useCallback(
      (
        error: GeolocationPositionError,
        context: string
      ) => {
        logGpsError(
          context,
          error
        )

        const message =
          getGpsErrorMessage(
            error
          )

        setGpsError(
          message
        )

        /*
         * Permission denied means GPS cannot work.
         * Stop the session.
         *
         * For timeout/unavailable, keep navigation alive
         * because watchPosition may recover automatically.
         */
        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          setIsNavigating(
            false
          )

          if (
            watchIdRef.current !==
              null &&
            typeof navigator !==
              "undefined" &&
            navigator.geolocation
          ) {
            try {
              navigator.geolocation.clearWatch(
                watchIdRef.current
              )
            } catch {
              // Ignore.
            }

            watchIdRef.current =
              null
          }

          isStartingRef.current =
            false

          setNavigationMessage(
            "GPS permission is required for live navigation."
          )

          return
        }

        setNavigationMessage(
          "Searching for GPS signal..."
        )
      },
      []
    )

  /* =======================================================
     START NAVIGATION
  ======================================================= */

  const startNavigation =
    useCallback(() => {
      if (
        isStartingRef.current
      ) {
        return
      }

      const routeSteps =
        stepsRef.current

      const routeDestination =
        destinationRef.current

      /* ---------------------------------------------------
         VALIDATE ROUTE
      --------------------------------------------------- */

      if (
        !routeSteps.length
      ) {
        setGpsError(
          "Calculate a route before starting live navigation."
        )

        return
      }

      if (
        !routeDestination
      ) {
        setGpsError(
          "Destination coordinates are missing. Calculate the route again."
        )

        return
      }

      /* ---------------------------------------------------
         VALIDATE BROWSER
      --------------------------------------------------- */

      if (
        typeof window ===
          "undefined" ||
        typeof navigator ===
          "undefined"
      ) {
        setGpsError(
          "Live navigation must run in a browser."
        )

        return
      }

      if (
        !navigator.geolocation
      ) {
        setGpsError(
          "GPS location is not available on this device."
        )

        return
      }

      /* ---------------------------------------------------
         PREVENT DUPLICATE START
      --------------------------------------------------- */

      if (
        watchIdRef.current !==
          null
      ) {
        try {
          navigator.geolocation.clearWatch(
            watchIdRef.current
          )
        } catch {
          // Ignore.
        }

        watchIdRef.current =
          null
      }

      isStartingRef.current =
        true

      /* ---------------------------------------------------
         RESET STATE
      --------------------------------------------------- */

      currentStepRef.current = 0

      announced150Ref.current.clear()

      announcedTurnRef.current.clear()

      rerouteCooldownRef.current =
        0

      hasAnnouncedArrivalRef.current =
        false

      lastSpokenMessageRef.current =
        null

      lastSpokenTimeRef.current =
        0

      smoothedSpeedRef.current =
        null

      setCurrentStepIndex(0)

      setDistanceToDestination(
        null
      )

      setEtaSeconds(null)

      setArrivalTime(null)

      setPosition(null)

      setGpsError(null)

      setNavigationMessage(
        "Searching for your GPS location..."
      )

      /*
       * Do NOT start watchPosition until the initial
       * GPS request succeeds.
       *
       * This avoids the previous double-GPS-request
       * problem.
       */
      navigator.geolocation.getCurrentPosition(
        (gpsPosition) => {
          isStartingRef.current =
            false

          console.log(
            "Lincoln Navigation GPS acquired:",
            {
              latitude:
                gpsPosition.coords.latitude,

              longitude:
                gpsPosition.coords.longitude,

              accuracy:
                gpsPosition.coords.accuracy,

              speed:
                gpsPosition.coords.speed,

              heading:
                gpsPosition.coords.heading,
            }
          )

          setIsNavigating(
            true
          )

          setGpsError(null)

          setNavigationMessage(
            "GPS connected. Navigation started."
          )

          processGpsPosition(
            gpsPosition
          )

          /*
           * Speak confirmation only after GPS has
           * actually been acquired.
           */
          speakMessage(
            "GPS connected. Navigation started."
          )

          /* -----------------------------------------------
             START CONTINUOUS GPS WATCH
          ------------------------------------------------ */

          watchIdRef.current =
            navigator.geolocation.watchPosition(
              (
                updatedPosition
              ) => {
                processGpsPosition(
                  updatedPosition
                )
              },
              (error) => {
                handleGpsError(
                  error,
                  "continuous tracking"
                )
              },
              GPS_OPTIONS
            )
        },
        (error) => {
          isStartingRef.current =
            false

          /*
           * PREVIOUSLY: this logged the raw error with its own
           * console.error call right before handleGpsError below
           * did the exact same thing again via logGpsError — two
           * near-identical log lines for one failure, and (since
           * `error` here isn't always a real, fully-populated
           * GeolocationPositionError — see getGpsErrorMessage's
           * comment) the naive {code, message} extraction printed
           * as an uninformative bare "{}" with no indication of
           * what actually failed. handleGpsError's own logging
           * (now defensive, and a console.warn instead of an
           * error — see logGpsError) already covers this.
           */
          handleGpsError(
            error,
            "initial location"
          )

          /*
           * The initial location failed, so do not
           * leave the navigation UI claiming that
           * navigation is active.
           */
          setIsNavigating(
            false
          )
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      )
    }, [
      handleGpsError,
      processGpsPosition,
      speakMessage,
    ])

  /* =======================================================
     STOP WHEN DISABLED
  ======================================================= */

  useEffect(() => {
    if (!enabled) {
      /*
       * If the parent disables live navigation,
       * stop GPS immediately.
       */
      if (
        watchIdRef.current !==
          null
      ) {
        stopNavigation()
      }

      return
    }

    /*
     * Nothing is automatically started here.
     *
     * DirectionsPanel explicitly calls startNavigation()
     * when the user presses "Start Live Navigation".
     */
  }, [
    enabled,
    stopNavigation,
  ])

  /* =======================================================
     ROUTE CHANGE
  ======================================================= */

  useEffect(() => {
    /*
     * If the route changes while navigation is active,
     * reset step tracking so we don't continue using
     * the previous route's step index.
     */
    if (
      !steps ||
      steps.length === 0
    ) {
      return
    }

    currentStepRef.current = 0

    announced150Ref.current.clear()

    announcedTurnRef.current.clear()

    setCurrentStepIndex(0)
  }, [steps])

  /* =======================================================
     DESTINATION CHANGE
  ======================================================= */

  useEffect(() => {
    if (!destination) {
      setDistanceToDestination(
        null
      )

      setEtaSeconds(null)

      setArrivalTime(null)

      return
    }

    hasAnnouncedArrivalRef.current =
      false
  }, [destination])

  /* =======================================================
     CLEANUP ON UNMOUNT
  ======================================================= */

  useEffect(() => {
    return () => {
      if (
        watchIdRef.current !==
          null &&
        typeof navigator !==
          "undefined" &&
        navigator.geolocation
      ) {
        try {
          navigator.geolocation.clearWatch(
            watchIdRef.current
          )
        } catch {
          // Ignore cleanup errors.
        }

        watchIdRef.current =
          null
      }

      if (
        typeof window !==
          "undefined" &&
        "speechSynthesis" in
          window
      ) {
        try {
          window.speechSynthesis.cancel()
        } catch {
          // Ignore speech cleanup errors.
        }
      }

      isStartingRef.current =
        false
    }
  }, [])

  /* =======================================================
     RETURN
  ======================================================= */

  return {
    isNavigating,

    position,

    currentStepIndex,

    distanceToDestination,

    // Seconds remaining at the current live-GPS-derived speed
    // (falling back to a mode-typical average — see
    // DEFAULT_SPEEDS_METERS_PER_SECOND). Recalculated on every GPS
    // update; null until navigation has produced its first fix.
    etaSeconds,

    // Wall-clock estimated arrival — Date.now() + etaSeconds,
    // recomputed alongside it. Format with toLocaleTimeString() for
    // display.
    arrivalTime,

    navigationMessage,

    gpsError,

    startNavigation,

    stopNavigation,
  }
}