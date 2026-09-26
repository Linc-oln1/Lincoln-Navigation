"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUp, CameraOff, Compass, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Live View — the phone camera with a walking arrow, the next street /
 * instruction and the distance to the turn drawn on top. The arrow is
 * the bearing to the next maneuver minus the compass heading, so it
 * keeps pointing at the turn as you rotate the phone.
 */

interface LiveViewProps {
  position: { latitude: number; longitude: number } | null
  /** Current step coordinates are [lng, lat]. */
  step: { instruction: string; coordinates: [number, number][] } | undefined
  nextStep?: { instruction: string } | undefined
  distanceToDestination: number | null
  onClose: () => void
}

type OrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number
}

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLng = toRad(bLng - aLng)
  const y = Math.sin(dLng) * Math.cos(toRad(bLat))
  const x =
    Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
    Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** Shortest signed angle from a to b, in (-180, 180]. */
function angleDiff(a: number, b: number) {
  return ((b - a + 540) % 360) - 180
}

function formatDistance(m: number) {
  if (m < 1000) return `${Math.max(5, Math.round(m / 5) * 5)} m`
  return `${(m / 1000).toFixed(1)} km`
}

export function LiveView({
  position,
  step,
  nextStep,
  distanceToDestination,
  onClose,
}: LiveViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [needsCompassTap, setNeedsCompassTap] = useState(false)
  const [compassBlocked, setCompassBlocked] = useState(false)
  const headingRef = useRef<number | null>(null)

  /* ---------------- camera ---------------- */

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser can't open the camera.")
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
      } catch (err) {
        const denied =
          err instanceof DOMException &&
          (err.name === "NotAllowedError" || err.name === "SecurityError")
        setCameraError(
          denied
            ? "Camera access is blocked. Allow the camera for this site in your browser settings, then try again."
            : "No camera was found on this device."
        )
      }
    }

    void start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  /* ---------------- compass ---------------- */

  const onOrientation = useCallback((e: Event) => {
    const ev = e as OrientationEventWithCompass
    let h: number | null = null
    if (typeof ev.webkitCompassHeading === "number") {
      h = ev.webkitCompassHeading // iOS: already clockwise from north
    } else if (ev.absolute && typeof ev.alpha === "number") {
      h = (360 - ev.alpha) % 360 // Android absolute orientation
    }
    if (h === null || Number.isNaN(h)) return
    // Smooth around the circle so the arrow doesn't jitter.
    const prev = headingRef.current
    const next = prev === null ? h : (prev + angleDiff(prev, h) * 0.25 + 360) % 360
    headingRef.current = next
    setHeading(next)
  }, [])

  const listen = useCallback(() => {
    window.addEventListener("deviceorientationabsolute", onOrientation, true)
    window.addEventListener("deviceorientation", onOrientation, true)
  }, [onOrientation])

  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">
    }
    if (typeof DOE?.requestPermission === "function") {
      // iOS only hands out compass access after a tap.
      setNeedsCompassTap(true)
    } else {
      listen()
    }
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation, true)
      window.removeEventListener("deviceorientation", onOrientation, true)
    }
  }, [listen, onOrientation])

  const enableCompass = async () => {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">
    }
    try {
      const result = await DOE.requestPermission?.()
      if (result === "granted") {
        setNeedsCompassTap(false)
        listen()
      } else {
        setCompassBlocked(true)
        setNeedsCompassTap(false)
      }
    } catch {
      setCompassBlocked(true)
      setNeedsCompassTap(false)
    }
  }

  /* ---------------- Escape closes ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  /* ---------------- target maths ---------------- */

  const target = step?.coordinates[step.coordinates.length - 1]
  let bearing: number | null = null
  let toTurn: number | null = null
  if (position && target) {
    bearing = bearingDeg(position.latitude, position.longitude, target[1], target[0])
    toTurn = distanceM(position.latitude, position.longitude, target[1], target[0])
  }

  const rel = bearing !== null && heading !== null ? angleDiff(heading, bearing) : null
  const offScreen = rel !== null && Math.abs(rel) > 60
  const arrived = toTurn !== null && toTurn < 15
  const hasCompass = heading !== null

  return (
    <div className="fixed inset-0 z-[2500] overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* soft top/bottom scrims so text stays readable on any scene */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/75 to-transparent" />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
            Live View
          </p>
          <p className="mt-0.5 text-lg font-semibold leading-snug drop-shadow">
            {step?.instruction ?? "Following route…"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Live View"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/55 backdrop-blur active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* AR arrow — lies on the "ground" and rotates toward the turn */}
      {!cameraError && (
        <div
          className="pointer-events-none absolute inset-x-0 flex justify-center"
          style={{ bottom: "26%", perspective: "600px" }}
        >
          {hasCompass && rel !== null && !offScreen && !arrived ? (
            <div
              style={{
                transform: `rotateX(58deg) rotateZ(${rel}deg)`,
                transformStyle: "preserve-3d",
                transition: "transform 120ms linear",
              }}
            >
              <ArrowUp
                className="h-40 w-40 text-[#ffd34d] drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]"
                strokeWidth={2.4}
                aria-hidden
              />
            </div>
          ) : arrived ? (
            <div className="rounded-full bg-[#ffd34d] px-5 py-2 text-sm font-bold text-black shadow-xl">
              Your turn is here
            </div>
          ) : null}
        </div>
      )}

      {/* turn to face the route */}
      {hasCompass && offScreen && rel !== null && (
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-[#ffd34d] p-3 text-black shadow-xl",
            rel > 0 ? "right-3" : "left-3"
          )}
        >
          <ArrowUp
            className="h-8 w-8"
            style={{ transform: `rotate(${rel > 0 ? 90 : -90}deg)` }}
            aria-hidden
          />
        </div>
      )}

      {/* status messages */}
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-3 text-center">
        {cameraError && (
          <div className="mx-auto max-w-sm rounded-2xl bg-black/70 p-5 backdrop-blur">
            <CameraOff className="mx-auto mb-2 h-8 w-8 text-white/80" />
            <p className="text-sm">{cameraError}</p>
          </div>
        )}
        {needsCompassTap && (
          <button
            type="button"
            onClick={enableCompass}
            className="pointer-events-auto mx-auto flex items-center gap-2 rounded-full bg-[#ffd34d] px-5 py-3 text-sm font-bold text-black shadow-xl active:scale-95"
          >
            <Compass className="h-4 w-4" />
            Enable compass
          </button>
        )}
        {compassBlocked && (
          <p className="mx-auto max-w-xs rounded-xl bg-black/70 p-3 text-sm backdrop-blur">
            Compass access was denied, so the arrow can&apos;t point the way. Follow the
            instruction at the top instead.
          </p>
        )}
        {!needsCompassTap && !compassBlocked && !hasCompass && !cameraError && (
          <p className="mx-auto max-w-xs rounded-xl bg-black/60 p-3 text-sm backdrop-blur">
            Hold your phone upright and move it slightly to calibrate the compass…
          </p>
        )}
        {!position && (
          <p className="mx-auto max-w-xs rounded-xl bg-black/60 p-3 text-sm backdrop-blur">
            Waiting for your location…
          </p>
        )}
      </div>

      {/* bottom info */}
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 pb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-bold leading-none drop-shadow">
              {toTurn !== null ? formatDistance(toTurn) : "—"}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/70">
              to next turn
            </p>
            {nextStep && (
              <p className="mt-2 max-w-[16rem] text-xs text-white/80">
                Then: {nextStep.instruction}
              </p>
            )}
          </div>
          {distanceToDestination !== null && (
            <div className="text-right">
              <p className="text-xl font-semibold">{formatDistance(distanceToDestination)}</p>
              <p className="text-xs uppercase tracking-wide text-white/70">to destination</p>
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-white/60">
          Keep looking where you&apos;re walking — glance at the screen, don&apos;t stare.
        </p>
      </div>
    </div>
  )
}
