"use client"

import { Lock, TrafficCone } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { cn } from "@/lib/utils"

interface TrafficToggleProps {
  /** Visitor has Premium — the toggle works. Otherwise it's a padlocked upsell. */
  isPremium: boolean
  showTraffic: boolean
  onToggle: () => void
}

export const TRAFFIC_COLORS = {
  low: "#2ecc71",
  moderate: "#f1c40f",
  heavy: "#e67e22",
  severe: "#c0392b",
} as const

const LEVELS = ["low", "moderate", "heavy", "severe"] as const

const BUTTON =
  "absolute top-[8.75rem] right-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-sm transition-colors"

/**
 * Live traffic switch (Premium — "Advanced traffic"). Sits under the map
 * style button; when on, a small colour key explains the lines.
 */
export function TrafficToggle({ isPremium, showTraffic, onToggle }: TrafficToggleProps) {
  const { t } = useI18n()

  if (!isPremium) {
    return (
      <a
        href="/pricing"
        title={t("traffic.premiumOnly")}
        aria-label={t("traffic.premiumOnly")}
        className={cn(BUTTON, "border-border bg-card/90 text-foreground hover:bg-secondary")}
      >
        <TrafficCone className="h-5 w-5" />
        <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-card p-0.5 text-primary" aria-hidden />
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={showTraffic}
        aria-label={t("traffic.label")}
        title={t("traffic.label")}
        className={cn(
          BUTTON,
          showTraffic
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card/90 text-foreground hover:bg-secondary"
        )}
      >
        <TrafficCone className="h-5 w-5" />
      </button>

      {showTraffic && (
        <div
          className="absolute top-[20rem] right-4 z-[1000] rounded-xl border border-border bg-card/90 px-3 py-2 shadow-lg backdrop-blur-sm"
          aria-label={t("traffic.label")}
        >
          <ul className="space-y-1.5">
            {LEVELS.map((level) => (
              <li key={level} className="flex items-center gap-2 text-[11px] font-medium text-foreground">
                <span
                  className="h-1.5 w-5 rounded-full"
                  style={{ backgroundColor: TRAFFIC_COLORS[level] }}
                  aria-hidden
                />
                {t(`traffic.${level}` as const)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
