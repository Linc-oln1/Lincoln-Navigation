"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MapPin, Radio, Square } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { geo } from "@/lib/native"

/**
 * The page a driver opens from the link their dispatcher sent. No account:
 * the secret in the link identifies the vehicle. Location is only shared
 * while "Sharing" is on, and stopping clears it straight away.
 */

const SEND_EVERY_MS = 8000

type Status = "loading" | "invalid" | "ready" | "sharing" | "denied" | "error"

export function DriverShare({ token }: { token: string }) {
  const { t } = useI18n()
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
    if (watchRef.current !== null) geo().clearWatch(watchRef.current)
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
    watchRef.current = geo().watchPosition(
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
      if (watchRef.current !== null) geo().clearWatch(watchRef.current)
    }
  }, [])

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      {/* Drivers may not read English: let them pick their language on the spot. */}
      <div className="absolute right-4 top-4">
        <LanguageSwitcher
          buttonClass="border border-border text-foreground hover:bg-secondary"
          menuClass="border-border bg-card text-foreground"
          showLabel
        />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          {status === "sharing" ? <Radio className="h-6 w-6 animate-pulse text-primary" /> : <MapPin className="h-6 w-6 text-primary" />}
        </div>

        {status === "loading" && <p className="text-sm text-muted-foreground">{t("drive.loading")}</p>}

        {status === "invalid" && (
          <>
            <h1 className="text-lg font-semibold">{t("drive.invalidTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("drive.invalidBody")}
            </p>
          </>
        )}

        {status === "error" && (
          <p className="text-sm text-muted-foreground">{t("drive.error")}</p>
        )}

        {(status === "ready" || status === "sharing" || status === "denied") && vehicle && (
          <>
            <h1 className="text-lg font-semibold">{vehicle.name}</h1>
            {vehicle.plate && <p className="text-sm text-muted-foreground">{vehicle.plate}</p>}

            {status === "sharing" ? (
              <>
                <p className="mt-4 text-sm">
                  {t("drive.sharing")}
                  {sentAt && (
                    <span className="block text-xs text-muted-foreground">
                      {t("drive.lastSent", { time: sentAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) })}
                    </span>
                  )}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("drive.keepOpen")}
                </p>
                <button
                  type="button"
                  onClick={stop}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70"
                >
                  <Square className="h-4 w-4" /> {t("drive.stop")}
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t("drive.intro")}
                </p>
                {status === "denied" && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {t("drive.denied")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={start}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <Radio className="h-4 w-4" /> {t("drive.start")}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
