"use client"

import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"

import { Bus, Car, Motorbike } from "lucide-react"
import { cn } from "@/lib/utils"

export type SpeedMode = "driving" | "motorcycle" | "bus"

const MODE_INFO: Record<
  SpeedMode,
  { label: string; icon: typeof Car; gaugeMaxKmh: number; fastKmh: number }
> = {
  driving: { label: "Car", icon: Car, gaugeMaxKmh: 160, fastKmh: 110 },
  motorcycle: { label: "Moto", icon: Motorbike, gaugeMaxKmh: 140, fastKmh: 90 },
  bus: { label: "Bus", icon: Bus, gaugeMaxKmh: 120, fastKmh: 80 },
}

export function isSpeedMode(mode: string): mode is SpeedMode {
  return mode === "driving" || mode === "motorcycle" || mode === "bus"
}

/** GPS speed (m/s) -> km/h, or null when the device has no reading. */
export function toKmh(metersPerSecond: number | null): number | null {
  if (metersPerSecond === null || !Number.isFinite(metersPerSecond)) return null
  return Math.max(0, Math.round(metersPerSecond * 3.6))
}

export function SpeedReader({
  mode,
  speedMps,
  compact = false,
}: {
  mode: SpeedMode
  speedMps: number | null
  compact?: boolean
}) {
  const { t } = useI18n()
  const { icon: Icon, gaugeMaxKmh, fastKmh } = MODE_INFO[mode]
  const label = t(
    (mode === "driving" ? "speed.car" : mode === "motorcycle" ? "speed.moto" : "speed.bus") as MessageKey,
  )
  const speedAria = t("speed.aria", { mode: label })
  const kmh = toKmh(speedMps)
  const pct = kmh === null ? 0 : Math.min(100, (kmh / gaugeMaxKmh) * 100)
  const fast = kmh !== null && kmh >= fastKmh

  if (compact) {
    return (
      <div
        className="flex items-center gap-3"
        role="status"
        aria-label={speedAria}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="w-14 text-right text-2xl font-extrabold tabular-nums leading-none">
          {kmh === null ? "--" : kmh}
        </span>
        <span className="text-[11px] uppercase tracking-wide opacity-80">km/h</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              fast ? "bg-amber-300" : "bg-white",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
          {label}
        </span>
      </div>
    )
  }

  return (
    <div
      className="mt-3 rounded-lg bg-black/20 px-3 py-2.5"
      role="status"
      aria-label={speedAria}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-1 items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tabular-nums leading-none">
            {kmh === null ? "--" : kmh}
          </span>
          <span className="text-xs uppercase tracking-wide opacity-80">km/h</span>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {label}
        </span>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/20">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            fast ? "bg-amber-300" : "bg-white",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {kmh === null && (
        <p className="mt-1.5 text-[11px] opacity-70">{t("speed.waiting")}</p>
      )}
    </div>
  )
}
