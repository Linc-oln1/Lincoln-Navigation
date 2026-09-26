"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MapPin, Radio, Square } from "lucide-react"

/**
 * The page a driver opens from the link their dispatcher sent. No account:
 * the secret in the link identifies the vehicle. Location is only shared
 * while "Sharing" is on, and stopping clears it straight away.
 */

const SEND_EVERY_MS = 8000

type Status = "loading" | "invalid" | "ready" | "sharing" | "denied" | "error"

export function DriverShare({ token }: { token: string }) {
  const [vehicle, setVehicle] = useState<{ name: string; plate: string | null } | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [sentAt, setSentAt] = useState<Date | null>(null)
  const watchRef = useRef<number | null>(null)
  const lastSentRef = useRef(0)
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/fleet/driver?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) return setStatus("invalid")
        setVehicle(await res.json())
        setStatus("ready")
      })
      .catch(() => !cancelled && setStatus("error"))
    return () => {
      cancelled = true
    }
  }, [token])

  const send = useCallback(
    async (pos: GeolocationPosition) => {
      const now = Date.now()
      if (now - lastSentRef.current < SEND_EVERY_MS) return
      lastSentRef.current = now
      try {
        const res = await fetch("/api/fleet/position", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
          }),
        })
        if (res.status === 404) return setStatus("invalid")
        if (res.ok) setSentAt(new Date())
      } catch {
        // Offline for a moment — the next fix will retry.
      }
    },
    [token]
  )

  const stop = useCallback(async () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
    void wakeRef.current?.release().catch(() => {})
    wakeRef.current = null
    setStatus((s) => (s === "sharing" ? "ready" : s))
    setSentAt(null)
    try {
      await fetch("/api/fleet/position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, stop: true }),
      })
    } catch {}
  }, [token])

  const start = () => {
    if (!("geolocation" in navigator)) return setStatus("denied")
    lastSentRef.current = 0
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus("sharing")
        void send(pos)
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
    // Keep the screen on so the phone keeps reporting (where supported).
    ;(navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
      ?.request("screen")
      .then((lock) => (wakeRef.current = lock))
      .catch(() => {})
  }

  // Stop reporting if the page is closed.
  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          {status === "sharing" ? <Radio className="h-6 w-6 animate-pulse text-primary" /> : <MapPin className="h-6 w-6 text-primary" />}
        </div>

        {status === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}

        {status === "invalid" && (
          <>
            <h1 className="text-lg font-semibold">This link isn&rsquo;t valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              It may have been replaced. Ask your dispatcher for a new link.
            </p>
          </>
        )}

        {status === "error" && (
          <p className="text-sm text-muted-foreground">Couldn&rsquo;t reach the server. Check your connection and reload.</p>
        )}

        {(status === "ready" || status === "sharing" || status === "denied") && vehicle && (
          <>
            <h1 className="text-lg font-semibold">{vehicle.name}</h1>
            {vehicle.plate && <p className="text-sm text-muted-foreground">{vehicle.plate}</p>}

            {status === "sharing" ? (
              <>
                <p className="mt-4 text-sm">
                  Sharing your location with your dispatcher.
                  {sentAt && (
                    <span className="block text-xs text-muted-foreground">
                      Last sent {sentAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                    </span>
                  )}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Keep this page open with the screen on. Don&rsquo;t hold the phone while driving.
                </p>
                <button
                  type="button"
                  onClick={stop}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70"
                >
                  <Square className="h-4 w-4" /> Stop sharing
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  Your dispatcher will see where this vehicle is while you share. You can stop at any time.
                </p>
                {status === "denied" && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    Location is blocked. Allow location for this site in your browser settings, then try again.
                  </p>
                )}
                <button
                  type="button"
                  onClick={start}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <Radio className="h-4 w-4" /> Start sharing my location
                </button>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
