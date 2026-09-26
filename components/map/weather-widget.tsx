"use client"

import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"

import { useMemo, useState } from "react"
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Moon,
  RefreshCw,
  Sun,
  Wind,
  X as CloseIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useWeather } from "@/hooks/use-weather"
import {
  describeWeatherCode,
  localDayLabel,
  localHourLabel,
  weatherEmoji,
  type Condition,
} from "@/lib/weather"

/* Small conditions + short-forecast card, pinned below the header
   on the left of the map. Collapsed by default to a temperature
   pill; tap to expand. Reads the area the map is currently
   showing (see useWeather / /api/weather). */

interface WeatherWidgetProps {
  center: [number, number] | null
}

function ConditionIcon({
  condition,
  isDay,
  className,
}: {
  condition: Condition
  isDay: boolean
  className?: string
}) {
  const cls = className ?? "w-5 h-5"

  switch (condition) {
    case "clear":
      return isDay ? (
        <Sun className={cn(cls, "text-amber-500")} />
      ) : (
        <Moon className={cn(cls, "text-slate-300")} />
      )
    case "partly-cloudy":
      return <Cloud className={cn(cls, "text-slate-400")} />
    case "cloudy":
      return <Cloud className={cn(cls, "text-slate-500")} />
    case "fog":
      return <CloudFog className={cn(cls, "text-slate-400")} />
    case "drizzle":
      return <CloudDrizzle className={cn(cls, "text-sky-500")} />
    case "rain":
    case "rain-showers":
      return <CloudRain className={cn(cls, "text-sky-600")} />
    case "freezing-rain":
      return <CloudSnow className={cn(cls, "text-cyan-500")} />
    case "snow":
    case "snow-showers":
      return <CloudSnow className={cn(cls, "text-cyan-400")} />
    case "thunderstorm":
      return <CloudLightning className={cn(cls, "text-violet-500")} />
    default:
      return <Cloud className={cn(cls, "text-slate-400")} />
  }
}

/* describeWeatherCode() returns English labels; this maps them to
   translation keys (anything unmapped is shown as-is). */
const WX_KEYS: Record<string, MessageKey> = {
  "Clear sky": "wx.clear",
  "Mainly clear": "wx.mainlyClear",
  "Partly cloudy": "wx.partlyCloudy",
  Overcast: "wx.overcast",
  Cloudy: "wx.cloudy",
  Fog: "wx.fog",
  "Rime fog": "wx.rimeFog",
  "Light drizzle": "wx.lightDrizzle",
  Drizzle: "wx.drizzle",
  "Heavy drizzle": "wx.heavyDrizzle",
  "Freezing drizzle": "wx.freezingDrizzle",
  "Light rain": "wx.lightRain",
  Rain: "wx.rain",
  "Heavy rain": "wx.heavyRain",
  "Freezing rain": "wx.freezingRain",
  "Light snow": "wx.lightSnow",
  Snow: "wx.snow",
  "Heavy snow": "wx.heavySnow",
  "Snow grains": "wx.snowGrains",
  "Light showers": "wx.lightShowers",
  Showers: "wx.showers",
  "Violent showers": "wx.violentShowers",
  "Snow showers": "wx.snowShowers",
  "Heavy snow showers": "wx.heavySnowShowers",
  Thunderstorm: "wx.thunderstorm",
  "Thunderstorm with hail": "wx.thunderstormHail",
}

export function WeatherWidget({ center }: WeatherWidgetProps) {
  const { t, lang } = useI18n()
  const wx = (label: string) => (WX_KEYS[label] ? t(WX_KEYS[label]) : label)
  const [expanded, setExpanded] = useState(false)
  const { weather, isLoading, error, refresh } = useWeather(center)

  const current = weather?.current
  const info = useMemo(
    () => (current ? describeWeatherCode(current.code) : null),
    [current]
  )

  // Nothing to show yet and nothing failed — stay out of the way.
  if (!weather && !isLoading && !error) return null

  return (
    <div className="absolute top-20 left-4 z-[1000] w-[calc(100vw-2rem)] max-w-[300px]">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/90 backdrop-blur-sm border border-border shadow-lg text-foreground hover:bg-card transition-colors"
          aria-label={t("wx.show")}
        >
          {current && info ? (
            <>
              <ConditionIcon
                condition={info.condition}
                isDay={current.isDay}
              />
              <span className="text-sm font-semibold tabular-nums">
                {current.temp}°
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {wx(info.label)}
              </span>
            </>
          ) : isLoading ? (
            <>
              <Cloud className="w-5 h-5 text-muted-foreground animate-pulse" />
              <span className="text-xs text-muted-foreground">
                {t("wx.loading")}
              </span>
            </>
          ) : (
            <>
              <Cloud className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t("wx.unavailable")}
              </span>
            </>
          )}
        </button>
      ) : (
        <div className="rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("wx.here")}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={refresh}
                aria-label={t("wx.refresh")}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <RefreshCw
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground",
                    isLoading && "animate-spin"
                  )}
                />
              </button>
              <button
                onClick={() => setExpanded(false)}
                aria-label={t("wx.collapse")}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <CloseIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {error && !weather ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              {error}
            </div>
          ) : current && info ? (
            <>
              {/* CURRENT */}
              <div className="px-4 pb-3 flex items-start gap-3">
                <ConditionIcon
                  condition={info.condition}
                  isDay={current.isDay}
                  className="w-10 h-10 mt-0.5"
                />
                <div className="min-w-0">
                  <div className="text-3xl font-bold leading-none tabular-nums">
                    {current.temp}°
                    <span className="text-base font-normal text-muted-foreground">
                      C
                    </span>
                  </div>
                  <div className="text-sm text-foreground mt-0.5">
                    {wx(info.label)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("wx.feels", { temp: current.feelsLike })}
                  </div>
                </div>
              </div>

              {/* METRICS */}
              <div className="px-4 pb-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" />
                  {current.humidity}%
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5" />
                  {current.windSpeed} km/h
                </span>
              </div>

              {/* HOURLY */}
              {weather.hourly.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                    {weather.hourly.slice(0, 12).map((h) => (
                      <div
                        key={h.time}
                        className="flex flex-col items-center gap-1 shrink-0"
                      >
                        <span className="text-[11px] text-muted-foreground">
                          {localHourLabel(
                            h.time,
                            weather.utcOffsetSeconds,
                            lang
                          )}
                        </span>
                        <span className="text-base leading-none">
                          {weatherEmoji(h.code, current.isDay)}
                        </span>
                        <span className="text-xs font-medium tabular-nums">
                          {h.temp}°
                        </span>
                        {h.precipProbability >= 20 && (
                          <span className="text-[10px] text-sky-500 tabular-nums">
                            {h.precipProbability}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DAILY */}
              {weather.daily.length > 0 && (
                <div className="border-t border-border px-4 py-2">
                  {weather.daily.slice(0, 5).map((d, i) => {
                    const dayInfo = describeWeatherCode(d.code)
                    return (
                      <div
                        key={d.date}
                        className="flex items-center gap-3 py-1.5 text-sm"
                      >
                        <span className="w-10 text-muted-foreground">
                          {i === 0 ? t("wx.today") : localDayLabel(d.date, lang)}
                        </span>
                        <ConditionIcon
                          condition={dayInfo.condition}
                          isDay
                          className="w-4 h-4 shrink-0"
                        />
                        {d.precipProbability >= 20 ? (
                          <span className="text-[11px] text-sky-500 tabular-nums w-8">
                            {d.precipProbability}%
                          </span>
                        ) : (
                          <span className="w-8" />
                        )}
                        <span className="ml-auto tabular-nums">
                          <span className="font-medium">{d.tempMax}°</span>{" "}
                          <span className="text-muted-foreground">
                            {d.tempMin}°
                          </span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ATTRIBUTION */}
              <div className="px-4 py-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  {t("wx.by", {
                    provider:
                      weather.provider === "openweather" ? "OpenWeather" : "Open-Meteo",
                  })}
                </p>
              </div>
            </>
          ) : (
            <div className="px-4 pb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Cloud className="w-4 h-4 animate-pulse" />
              Loading weather…
            </div>
          )}
        </div>
      )}
    </div>
  )
}
