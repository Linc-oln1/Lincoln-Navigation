"use client"

import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"

import { useState } from "react"
import { ChevronDown, Loader2, TriangleAlert, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { type OnRouteHazard } from "@/lib/hazard-geometry"
import { hazardKindMeta, relativeTime, type Hazard } from "@/lib/hazards"

interface SaferRoute {
  /** Extra time vs. the fastest route, in seconds. */
  extraSeconds: number
  /** Hazards on the fastest route that the safer one avoids. */
  avoidedCount: number
}

interface RouteHazardWarningProps {
  items: OnRouteHazard[]
  /** Tapping a row asks the app to highlight that hazard on the map. */
  onFocus?: (hazard: Hazard) => void
  /** A materially safer alternative to offer, or null. */
  saferRoute?: SaferRoute | null
  onUseSaferRoute?: () => void
  onDismissSafer?: () => void
  /** "Route around it" — ask a routing engine for a real detour.
      Offered only when there's no plain safer alternative already. */
  onRouteAround?: () => void
  routeAroundBusy?: boolean
  routeAroundError?: string | null
}

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

function saferLabel(safer: SaferRoute, t: Translate): string {
  const mins = Math.round(safer.extraSeconds / 60)
  const what =
    safer.avoidedCount >= 2
      ? t("rhw.whatMany", { n: safer.avoidedCount })
      : safer.avoidedCount === 1
        ? t("rhw.whatOne")
        : t("rhw.whatFewer")
  if (mins <= 0) return t("rhw.saferSame", { what })
  return t("rhw.saferAdds", { what, mins })
}

/** "820 m" / "1.2 km" along the route, for the "{dist} in" label. */
function alongDistance(metres: number): string {
  return metres < 950
    ? `${Math.round(metres / 10) * 10} m`
    : `${(metres / 1000).toFixed(1)} km`
}

export function RouteHazardWarning({
  items,
  onFocus,
  saferRoute,
  onUseSaferRoute,
  onDismissSafer,
  onRouteAround,
  routeAroundBusy,
  routeAroundError,
}: RouteHazardWarningProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  if (items.length === 0 && !saferRoute) return null

  const showRouteAround = !saferRoute && items.length > 0 && !!onRouteAround

  const severe = items.some(
    ({ hazard }) => hazard.kind === "closure" || hazard.severity >= 0.7
  )

  return (
    <div
      className={cn(
        "mb-4 rounded-xl border overflow-hidden",
        severe
          ? "border-destructive/40 bg-destructive/10"
          : "border-amber-500/40 bg-amber-500/10"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-3 text-left"
      >
        <TriangleAlert
          className={cn(
            "w-4 h-4 shrink-0",
            severe ? "text-destructive" : "text-amber-600"
          )}
        />
        <span className="text-sm font-medium flex-1">
          {items.length === 1 ? t("rhw.one") : t("rhw.many", { n: items.length })}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && items.length > 0 && (
        <ul className="border-t border-border/50 divide-y divide-border/50">
          {items.map(({ hazard, metresAlongRoute }) => {
            const meta = hazardKindMeta(hazard.kind)
            return (
              <li key={hazard.id}>
                <button
                  type="button"
                  onClick={() => onFocus?.(hazard)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="text-base leading-none" aria-hidden>
                    {meta.emoji}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {t(`hazard.${hazard.kind}` as MessageKey)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {hazard.source === "crowd_report"
                        ? t("rhw.reported", { when: relativeTime(hazard.createdAt, t) })
                        : t("rhw.known")}
                      {" · "}
                      {t("rhw.in", { dist: alongDistance(metresAlongRoute) })}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {saferRoute && (
        <div className="border-t border-border/50 p-3 flex items-center gap-2">
          <span className="flex-1 text-xs text-muted-foreground">
            {saferLabel(saferRoute, t)}
          </span>
          <button
            type="button"
            onClick={onUseSaferRoute}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            {t("rhw.useIt")}
          </button>
          <button
            type="button"
            onClick={onDismissSafer}
            aria-label={t("rhw.keepFastest")}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {showRouteAround && (
        <div className="border-t border-border/50 p-3">
          {routeAroundError ? (
            <p className="text-xs text-muted-foreground">{routeAroundError}</p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs text-muted-foreground">
                {items.length === 1 ? t("rhw.tryOne") : t("rhw.tryMany")}
              </span>
              <button
                type="button"
                onClick={onRouteAround}
                disabled={routeAroundBusy}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {routeAroundBusy && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                {t("rhw.routeAround")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
