"use client"

import { useEffect, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { MapPin } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { formatDuration } from "@/lib/routing"

if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.js")
}

interface ShareState {
  status: "live" | "ended"
  label: string | null
  destination: string | null
  expiresAt?: string
  serverTime?: string
  position: { lat: number; lng: number; speed: number | null; heading: number | null; seenAt: string | null } | null
}

const POLL_MS = 7000
const STALE_MS = 2 * 60 * 1000

/**
 * What friends and family see: a map with the sender's latest position, when
 * it was last updated, and a clear message when the share has ended. Anyone
 * with the link can watch; nothing here can change the share.
 */
export function TrackView({ token }: { token: string }) {
  const { t } = useI18n()
  const durationLabels = { min: t("unit.min"), hr: t("unit.hr"), lessThanMin: t("unit.lessThanMin") }
  const [state, setState] = useState<ShareState | null>(null)
  const [problem, setProblem] = useState<"invalid" | "error" | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const skewRef = useRef(0)
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const trailRef = useRef<[number, number][]>([])
  const centeredRef = useRef(false)

  // Poll the server until the share ends.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      try {
        const res = await fetch(`/api/share/view?token=${encodeURIComponent(token)}`, { cache: "no-store" })
        if (cancelled) return
        if (res.status === 404 || res.status === 429) return setProblem("invalid")
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as ShareState
        setProblem(null)
        setState(data)
        if (data.serverTime) skewRef.current = Date.now() - Date.parse(data.serverTime)
        if (data.status === "ended") return
      } catch {
        if (!cancelled) setProblem((p) => p ?? "error")
      }
      timer = setTimeout(tick, POLL_MS)
    }
    void tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [token])

  // Re-render every few seconds so "updated 12 s ago" stays honest.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  // Map + marker.
  const pos = state?.status === "live" ? state.position : null
  useEffect(() => {
    if (!pos || !mapDiv.current) return

    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: mapDiv.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [pos.lng, pos.lat],
        zoom: 15,
        attributionControl: { compact: true },
      })
      mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left")
      mapRef.current.on("load", () => {
        const map = mapRef.current!
        map.addSource("trail", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } })
        map.addLayer({ id: "trail", type: "line", source: "trail", paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.6 } })
      })
    }
    const map = mapRef.current

    if (!markerRef.current) {
      const el = document.createElement("div")
      el.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,.25)"
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([pos.lng, pos.lat]).addTo(map)
    } else {
      markerRef.current.setLngLat([pos.lng, pos.lat])
    }

    // A short trail of what this page has seen (not stored anywhere).
    const trail = trailRef.current
    const last = trail[trail.length - 1]
    if (!last || last[0] !== pos.lng || last[1] !== pos.lat) trail.push([pos.lng, pos.lat])
    if (trail.length > 200) trail.shift()
    const source = map.getSource("trail") as maplibregl.GeoJSONSource | undefined
    source?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: trail } })

    if (!centeredRef.current) {
      centeredRef.current = true
    } else {
      map.easeTo({ center: [pos.lng, pos.lat], duration: 800 })
    }
  }, [pos?.lat, pos?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    },
    []
  )

  const ageMs = pos?.seenAt ? now - skewRef.current - Date.parse(pos.seenAt) : null
  const stale = ageMs !== null && ageMs > STALE_MS
  const secs = ageMs === null ? null : Math.max(0, Math.round(ageMs / 1000))
  const msLeft = state?.expiresAt ? Date.parse(state.expiresAt) - (now - skewRef.current) : null

  const Card = ({ children }: { children: React.ReactNode }) => (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher buttonClass="border border-border text-foreground hover:bg-secondary" menuClass="border-border bg-card text-foreground" showLabel />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        {children}
      </div>
    </main>
  )

  if (problem === "invalid")
    return (
      <Card>
        <h1 className="text-lg font-semibold">{t("track.invalidTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("track.invalidBody")}</p>
      </Card>
    )

  if (state?.status === "ended")
    return (
      <Card>
        <h1 className="text-lg font-semibold">{t("track.endedTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {state.label ? t("track.endedBody", { name: state.label }) : t("track.endedBodyPlain")}
        </p>
      </Card>
    )

  if (!state)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{problem === "error" ? t("track.error") : t("drive.loading")}</p>
      </Card>
    )

  return (
    <main className="relative flex h-[100dvh] flex-col bg-background text-foreground">
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 rounded-2xl border border-border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur-xl">
          <p className="truncate text-sm font-semibold">{state.label || t("track.someone")}</p>
          <p className="text-xs text-muted-foreground">
            {pos ? (
              <span className={stale ? "text-amber-500" : "text-green-500"}>
                {stale ? t("track.stale") : t("track.live")}
                {secs !== null && ` · ${t("track.updated", { ago: formatDuration(secs, durationLabels) })}`}
              </span>
            ) : (
              t("track.waiting")
            )}
          </p>
          {state.destination && <p className="mt-0.5 truncate text-xs text-muted-foreground">{t("track.to", { place: state.destination })}</p>}
          {msLeft !== null && msLeft > 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("track.endsIn", { time: formatDuration(msLeft / 1000, durationLabels) })}</p>
          )}
        </div>
        <LanguageSwitcher buttonClass="border border-border bg-card/95 text-foreground hover:bg-secondary" menuClass="border-border bg-card text-foreground" />
      </div>
      {pos ? (
        <div ref={mapDiv} className="h-full w-full" />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">{t("track.waitingBody")}</div>
      )}
    </main>
  )
}
