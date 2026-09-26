"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Lock, LocateFixed, MapPin, Route as RouteIcon, Trash2, X } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { cn } from "@/lib/utils"
import { geocode, type GeocodeResult } from "@/lib/geocoding"
import { formatDistance, formatDuration } from "@/lib/routing"

interface PlannerStop {
  id: string
  name: string
  lat: number
  lng: number
}

interface OptimizeResult {
  order: number[]
  legs: { duration: number; distance: number }[]
  duration: number
  distance: number
  geometry: [number, number][]
}

interface RoutePlannerProps {
  isPro: boolean
  /** Device position as [lat, lng], for "use my location as the start". */
  userLocation: [number, number] | null
  /** Draw the finished route and numbered stops on the map. */
  onShowRoute: (points: [number, number][], stops: { name: string; position: [number, number] }[]) => void
}

const BUTTON =
  "absolute top-[16.25rem] right-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-sm transition-colors"
const MAX_STOPS = 12

/**
 * Route optimization (Pro): enter several places, get the best order to
 * visit them and the route through them. Non-Pro visitors get a padlocked
 * link to the pricing page.
 */
export function RoutePlanner({ isPro, userLocation, onShowRoute }: RoutePlannerProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [stops, setStops] = useState<PlannerStop[]>([])
  const [roundtrip, setRoundtrip] = useState(false)
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ stops: PlannerStop[]; data: OptimizeResult } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    if (query.trim().length < 2) {
      setSuggestions([])
      setSearching(false)
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const found = await geocode(query, { limit: 5, signal: controller.signal })
        if (!controller.signal.aborted) setSuggestions(found)
      } catch {
        if (!controller.signal.aborted) setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  if (!isPro) {
    return (
      <a
        href="/pricing"
        title={t("plan.proOnly")}
        aria-label={t("plan.proOnly")}
        className={cn(BUTTON, "border-border bg-card/90 text-foreground hover:bg-secondary")}
      >
        <RouteIcon className="h-5 w-5" />
        <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-card p-0.5 text-primary" aria-hidden />
      </a>
    )
  }

  const addStop = (stop: PlannerStop) => {
    setStops((prev) => (prev.length >= MAX_STOPS ? prev : [...prev, stop]))
    setResult(null)
    setQuery("")
    setSuggestions([])
  }

  const addMyLocation = () => {
    if (!userLocation) return
    setStops((prev) => [
      { id: "me", name: t("plan.start"), lat: userLocation[0], lng: userLocation[1] },
      ...prev.filter((s) => s.id !== "me"),
    ].slice(0, MAX_STOPS))
    setResult(null)
  }

  const optimize = async () => {
    if (stops.length < 2) {
      setError(t("plan.needTwo"))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stops: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
          roundtrip,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t("plan.failed"))
      setResult({ stops, data })
    } catch (e) {
      setError(e instanceof Error ? e.message : t("plan.failed"))
    } finally {
      setBusy(false)
    }
  }

  const ordered = result ? result.data.order.map((i) => result.stops[i]) : []

  const show = () => {
    if (!result) return
    onShowRoute(
      result.data.geometry.map(([lng, lat]) => [lat, lng] as [number, number]),
      ordered.map((s) => ({ name: s.name, position: [s.lat, s.lng] as [number, number] }))
    )
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("plan.label")}
        title={t("plan.label")}
        className={cn(BUTTON, "border-border bg-card/90 text-foreground hover:bg-secondary")}
      >
        <RouteIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1600] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("plan.title")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <RouteIcon className="h-5 w-5 text-primary" />
                {t("plan.title")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
                className="rounded-lg p-1.5 hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("plan.intro")}</p>

            {!result && (
              <>
                {stops.length > 0 && (
                  <ol className="mt-4 space-y-1.5">
                    {stops.map((s, i) => (
                      <li key={s.id + i} className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                          {i === 0 ? "S" : i}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setStops((prev) => prev.filter((_, k) => k !== i))
                            setError(null)
                          }}
                          aria-label={`${t("plan.remove")}: ${s.name}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                {stops.length < MAX_STOPS ? (
                  <div className="mt-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={stops.length === 0 ? t("plan.start") : t("plan.addStop")}
                        className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {suggestions.length > 0 && (
                      <ul className="mt-1 overflow-hidden rounded-xl border border-border">
                        {suggestions.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => addStop({ id: r.id, name: r.name, lat: r.lat, lng: r.lng })}
                              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-secondary"
                            >
                              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{r.name}</span>
                                <span className="block truncate text-xs text-muted-foreground">{r.address}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!searching && query.trim().length >= 2 && suggestions.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">{t("plan.noResults")}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">{t("plan.max", { n: MAX_STOPS })}</p>
                )}

                {userLocation && !stops.some((s) => s.id === "me") && (
                  <button
                    type="button"
                    onClick={addMyLocation}
                    className="mt-3 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <LocateFixed className="h-4 w-4" />
                    {t("plan.useMyLocation")}
                  </button>
                )}

                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={roundtrip}
                    onChange={(e) => {
                      setRoundtrip(e.target.checked)
                      setResult(null)
                    }}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {t("plan.roundTrip")}
                </label>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={optimize}
                  disabled={busy || stops.length < 2}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? t("plan.working") : t("plan.optimize")}
                </button>
              </>
            )}

            {result && (
              <>
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("plan.result")}
                </h3>
                <p className="mt-1 text-sm font-medium">
                  {t("plan.total", {
                    distance: formatDistance(result.data.distance),
                    duration: formatDuration(result.data.duration),
                  })}
                </p>
                <ol className="mt-3 space-y-1">
                  {ordered.map((s, i) => (
                    <li key={s.id + i}>
                      <div className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {i === 0 ? "S" : i}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                      </div>
                      {result.data.legs[i] && (
                        <p className="py-1 pl-6 text-xs text-muted-foreground">
                          ↓{" "}
                          {t("plan.leg", {
                            distance: formatDistance(result.data.legs[i].distance),
                            duration: formatDuration(result.data.legs[i].duration),
                          })}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={show}
                    className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    {t("plan.show")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null)
                      setStops([])
                    }}
                    className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70"
                  >
                    {t("plan.clear")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
