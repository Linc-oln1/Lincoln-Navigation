"use client"

import { useEffect, useState } from "react"
import { Bell, Lock, X } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { cn } from "@/lib/utils"
import { formatDistance } from "@/lib/routing"
import { hazardKindMeta, relativeTime, type Hazard } from "@/lib/hazards"
import { ALERT_RADIUS_M, useNearbyAlerts } from "@/hooks/use-nearby-alerts"
import type { MessageKey } from "@/lib/i18n/messages"

interface RoadAlertsProps {
  isPremium: boolean
  /** Device position as [lat, lng]; null until the map has a fix. */
  position: [number, number] | null
  onSelect: (hazard: Hazard) => void
}

const BUTTON =
  "absolute top-[14.75rem] right-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-sm transition-colors"

/**
 * Real-time road alerts (Premium): a bell under the offline-maps button that
 * lists hazards within 5 km of the device, and pops a banner when a new one
 * appears. Free users get a padlocked link to the pricing page.
 */
export function RoadAlerts({ isPremium, position, onSelect }: RoadAlertsProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const { alerts, fresh, dismissFresh } = useNearbyAlerts(isPremium, position)

  // A new-alert banner clears itself.
  useEffect(() => {
    if (!fresh.length) return
    const id = setTimeout(dismissFresh, 9000)
    return () => clearTimeout(id)
  }, [fresh, dismissFresh])

  if (!isPremium) {
    return (
      <a
        href="/pricing"
        title={t("alerts.premiumOnly")}
        aria-label={t("alerts.premiumOnly")}
        className={cn(BUTTON, "border-border bg-card/90 text-foreground hover:bg-secondary")}
      >
        <Bell className="h-5 w-5" />
        <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-card p-0.5 text-primary" aria-hidden />
      </a>
    )
  }

  const kindLabel = (h: Hazard) => t(`hazard.${h.kind}` as MessageKey)
  const pick = (h: Hazard) => {
    setOpen(false)
    dismissFresh()
    onSelect(h)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("alerts.label")}
        title={t("alerts.label")}
        className={cn(
          BUTTON,
          open ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/90 text-foreground hover:bg-secondary"
        )}
      >
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {fresh.length > 0 && !open && (
        <button
          type="button"
          onClick={() => pick(fresh[0].hazard)}
          role="status"
          className="absolute left-4 right-16 top-[7.5rem] z-[1100] flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 text-left shadow-2xl backdrop-blur-xl"
        >
          <span className="text-2xl" aria-hidden>{hazardKindMeta(fresh[0].hazard.kind).emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-primary">{t("alerts.new")}</span>
            <span className="block truncate text-sm font-medium text-foreground">
              {kindLabel(fresh[0].hazard)} · {t("alerts.away", { distance: formatDistance(fresh[0].distanceM) })}
            </span>
            {fresh.length > 1 && (
              <span className="block text-xs text-muted-foreground">{t("alerts.more", { n: fresh.length - 1 })}</span>
            )}
          </span>
        </button>
      )}

      {open && (
        <div
          className="absolute right-4 top-[17.75rem] z-[1100] max-h-[50vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-card/95 p-3 text-foreground shadow-2xl backdrop-blur-xl"
          role="dialog"
          aria-label={t("alerts.label")}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("alerts.title", { km: ALERT_RADIUS_M / 1000 })}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
              className="rounded-lg p-1 hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!position ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("alerts.noLocation")}</p>
          ) : alerts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("alerts.none")}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {alerts.map(({ hazard, distanceM }) => (
                <li key={hazard.id}>
                  <button
                    type="button"
                    onClick={() => pick(hazard)}
                    className="flex w-full items-center gap-3 rounded-xl bg-secondary px-3 py-2 text-left hover:bg-secondary/70"
                  >
                    <span className="text-xl" aria-hidden>{hazardKindMeta(hazard.kind).emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{kindLabel(hazard)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t("alerts.away", { distance: formatDistance(distanceM) })}
                        {hazard.source === "crowd_report" ? ` · ${relativeTime(hazard.createdAt, t)}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">{t("alerts.note")}</p>
        </div>
      )}
    </>
  )
}
