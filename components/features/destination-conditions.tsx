"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Map as MapIcon } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { WX_KEYS } from "@/components/map/weather-widget"
import type { MessageKey } from "@/lib/i18n/messages"
import { fetchWeather, describeWeatherCode, weatherEmoji, type Weather } from "@/lib/weather"
import { fetchHazards, hazardKindMeta, relativeTime, type Hazard } from "@/lib/hazards"
import { haversineMeters } from "@/lib/geo-intelligence/confidence"
import type { GhanaDestination } from "@/lib/ghana-destinations"

// How far around a destination counts as "nearby" for hazards —
// roughly the last stretch of road into it.
const NEARBY_KM = 20
// ~20 km of latitude; longitude is close enough this near the equator.
const BOX_DEG = NEARBY_KM / 111

type Nearby = Hazard & { km: number }

type Conditions =
  | { status: "loading" }
  | { status: "ready"; weather: Weather | null; hazards: Nearby[] | null }

/** /app link that drops the pin on the destination's exact coordinates. */
export function mapHref(d: GhanaDestination, mode?: string): string {
  const params = new URLSearchParams({ lat: `${d.lat}`, lng: `${d.lng}`, name: d.name })
  if (mode) params.set("mode", mode)
  return `/app?${params.toString()}`
}

/**
 * Live weather and reported road hazards around one destination,
 * from the same /api/weather and /api/hazards the map uses. Each half
 * fails on its own — no weather still shows hazards, and vice versa.
 */
/* describeWeatherCode() labels are English; reuse the map widget's
   translation table for them (anything unmapped shows as-is). */
function useWeatherLabel() {
  const { t } = useI18n()
  return (label: string) => (WX_KEYS[label] ? t(WX_KEYS[label]) : label)
}

export function DestinationConditions({ destination: d }: { destination: GhanaDestination }) {
  const { t } = useI18n()
  const weatherLabel = useWeatherLabel()
  const [state, setState] = useState<Conditions>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: "loading" })

    const bbox = {
      minLat: d.lat - BOX_DEG,
      maxLat: d.lat + BOX_DEG,
      minLng: d.lng - BOX_DEG,
      maxLng: d.lng + BOX_DEG,
    }

    Promise.allSettled([fetchWeather(d.lat, d.lng, controller.signal), fetchHazards(bbox, controller.signal)]).then(
      ([w, h]) => {
        if (controller.signal.aborted) return
        const hazards =
          h.status === "fulfilled"
            ? h.value.hazards
                .filter((x) => x.status === "active")
                .map((x) => ({ ...x, km: haversineMeters(d, x.location) / 1000 }))
                .filter((x) => x.km <= NEARBY_KM)
                .sort((a, b) => a.km - b.km)
            : null
        setState({ status: "ready", weather: w.status === "fulfilled" ? w.value : null, hazards })
      },
    )

    return () => controller.abort()
  }, [d])

  const weather = state.status === "ready" ? state.weather : null
  const hazards = state.status === "ready" ? state.hazards : null
  const today = weather?.daily[0]

  return (
    <div className="mt-3 rounded-2xl border border-black/10 bg-white/60 p-3" aria-live="polite">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={d.photo} alt="" className="h-14 w-16 flex-shrink-0 rounded-xl object-cover" />
        <p className="text-xs leading-snug opacity-75">{t(`ft.blurb.${d.id}` as MessageKey)}</p>
      </div>

      <p className="mt-3 text-[10px] font-semibold tracking-[0.2em] uppercase opacity-50">{t("ft.rightNow")}</p>

      {state.status === "loading" ? (
        <div className="mt-2 space-y-2" aria-label={t("ft.loading")}>
          <div className="h-4 w-3/4 animate-pulse rounded bg-black/10" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-black/10" />
        </div>
      ) : (
        <div className="mt-2 space-y-2 text-sm">
          {weather ? (
            <p className="flex items-baseline gap-2">
              <span aria-hidden>{weatherEmoji(weather.current.code, weather.current.isDay)}</span>
              <span className="font-semibold">{Math.round(weather.current.temp)}°C</span>
              <span className="opacity-70">{weatherLabel(describeWeatherCode(weather.current.code).label)}</span>
              {today && (
                <span className="ms-auto text-xs opacity-55">
                  {t("ft.rainToday", { n: today.precipProbability })}
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs opacity-55">{t("ft.wxUnavailable")}</p>
          )}

          {hazards === null ? (
            <p className="text-xs opacity-55">{t("ft.hzUnavailable")}</p>
          ) : hazards.length === 0 ? (
            <p className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-700" />
              {t("ft.noHazards", { km: NEARBY_KM })}
            </p>
          ) : (
            <div>
              <p className="text-xs font-semibold text-[#b4441d]">
                {hazards.length === 1
                  ? t("ft.hazardsOne", { km: NEARBY_KM })
                  : t("ft.hazardsMany", { n: hazards.length, km: NEARBY_KM })}
              </p>
              <ul className="mt-1 space-y-1">
                {hazards.slice(0, 3).map((h) => {
                  const { emoji } = hazardKindMeta(h.kind)
                  return (
                    <li key={h.id} className="flex items-center gap-2 text-xs">
                      <span aria-hidden>{emoji}</span>
                      <span className="font-medium">{t(`hazard.${h.kind}` as MessageKey)}</span>
                      <span className="opacity-60">
                        {h.km < 1 ? t("ft.underKm") : t("ft.kmAway", { n: Math.round(h.km) })}
                        {h.source === "crowd_report" && ` · ${relativeTime(h.createdAt, t)}`}
                        {h.source === "forecast" && ` · ${t("ft.rainForecast")}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <Link
        href={mapHref(d)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#e8702a] hover:underline"
      >
        <MapIcon className="h-3.5 w-3.5" />
        {t("ft.viewOnMap")}
      </Link>
    </div>
  )
}
