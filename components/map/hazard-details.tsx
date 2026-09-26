"use client"

import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"

import { useState } from "react"
import { Check, ExternalLink, MapPin, ShieldAlert, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  hazardKindMeta,
  relativeTime,
  voteHazard,
  type Hazard,
} from "@/lib/hazards"

interface HazardDetailsProps {
  hazard: Hazard
  onClose: () => void
  /** Called with the updated hazard after a vote lands. */
  onVoted: (hazard: Hazard) => void
}

export function HazardDetails({ hazard, onClose, onVoted }: HazardDetailsProps) {
  const { t } = useI18n()
  const meta = hazardKindMeta(hazard.kind)
  const kindLabel = t(`hazard.${hazard.kind}` as MessageKey)
  const isCrowd = hazard.source === "crowd_report"
  const isForecast = hazard.source === "forecast"
  const isOfficial = hazard.source === "official"

  const [busy, setBusy] = useState<null | "confirm" | "clear">(null)
  const [voted, setVoted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleVote = async (vote: "confirm" | "clear") => {
    if (busy || voted) return
    setBusy(vote)
    setMessage(null)
    try {
      const { hazard: updated, counted } = await voteHazard(hazard.id, vote)
      setVoted(true)
      onVoted(updated)
      setMessage(
        !counted
          ? t("haz.alreadyVoted")
          : vote === "confirm"
            ? t("haz.thanksStill")
            : t("haz.thanksCleared")
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("haz.voteFail"))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-[380px] bg-card/95 backdrop-blur-xl z-[1001] border border-border rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
              style={{ backgroundColor: `${meta.color}22` }}
              aria-hidden
            >
              {meta.emoji}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">
                {kindLabel}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isCrowd ? (
                  <>{t("haz.reportedBy", { when: relativeTime(hazard.createdAt, t) })}</>
                ) : isForecast ? (
                  <>{t("haz.forecast")}</>
                ) : isOfficial ? (
                  <>{t("haz.official")}</>
                ) : (
                  <>{t("haz.known", { kind: kindLabel })}</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors shrink-0"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {hazard.note && (
          <p className="text-sm text-foreground">&ldquo;{hazard.note}&rdquo;</p>
        )}

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>
            {hazard.location.lat.toFixed(5)}, {hazard.location.lng.toFixed(5)}
          </span>
        </div>

        {isCrowd && (hazard.confirmedCount > 0 || hazard.clearedCount > 0) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{t("haz.confirmed", { n: hazard.confirmedCount })}</span>
            <span>{t("haz.saidCleared", { n: hazard.clearedCount })}</span>
          </div>
        )}

        {!isCrowd && (
          <div className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isForecast ? (
                <>{t("haz.forecastBody")}</>
              ) : isOfficial ? (
                <>{t("haz.officialBody")}</>
              ) : (
                <>{t("haz.knownBody")}</>
              )}
            </span>
          </div>
        )}

        {hazard.url && (
          <a
            href={hazard.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            {t("haz.viewReport")}
          </a>
        )}
      </div>

      {/* Vote actions — crowd reports only */}
      {isCrowd && (
        <div className="p-4 border-t border-border">
          {message ? (
            <p className="text-sm text-center text-muted-foreground py-1">
              {message}
            </p>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={busy !== null}
                onClick={() => handleVote("confirm")}
              >
                <Check className="w-4 h-4 mr-2" />
                {t("haz.stillThere")}
              </Button>
              <Button
                variant="secondary"
                className={cn("flex-1")}
                disabled={busy !== null}
                onClick={() => handleVote("clear")}
              >
                <X className="w-4 h-4 mr-2" />
                {t("haz.cleared")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
