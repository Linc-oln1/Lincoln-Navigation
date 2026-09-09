"use client"

import { useEffect, useState } from "react"
import { Crosshair, Loader2, MapPin, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  HAZARD_KIND_LIST,
  reportHazard,
  type Hazard,
  type HazardKind,
} from "@/lib/hazards"

interface ReportHazardSheetProps {
  open: boolean
  onClose: () => void
  /** Map centre, used as the default report location. */
  mapCenter: [number, number]
  /** Live GPS position if we have one. */
  userLocation: [number, number] | null
  /** Fires with the created (or matched-existing) hazard. */
  onReported: (hazard: Hazard) => void
}

const NOTE_MAX = 200

export function ReportHazardSheet({
  open,
  onClose,
  mapCenter,
  userLocation,
  onReported,
}: ReportHazardSheetProps) {
  const [kind, setKind] = useState<HazardKind | null>(null)
  const [useGps, setUseGps] = useState(false)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset each time the sheet is opened.
  useEffect(() => {
    if (open) {
      setKind(null)
      setUseGps(Boolean(userLocation))
      setNote("")
      setError(null)
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const [lat, lng] =
    useGps && userLocation ? userLocation : mapCenter

  const handleSubmit = async () => {
    if (!kind || submitting) return
    setSubmitting(true)
    setError(null)

    const result = await reportHazard({
      kind,
      lat,
      lng,
      note: note.trim() || undefined,
    })

    setSubmitting(false)

    if (result.ok) {
      onReported(result.hazard)
      onClose()
      return
    }

    setError(
      result.status === 429
        ? "You've reported a lot recently. Try again in a bit."
        : result.error
    )
  }

  return (
    <div className="absolute inset-x-0 bottom-0 md:inset-x-auto md:right-4 md:bottom-4 md:w-[380px] z-[1002] bg-card/95 backdrop-blur-xl border border-border rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-bold">Report a hazard</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Kind picker */}
        <div className="grid grid-cols-3 gap-2">
          {HAZARD_KIND_LIST.map((meta) => (
            <button
              key={meta.kind}
              onClick={() => setKind(meta.kind)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors",
                kind === meta.kind
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              )}
            >
              <span className="text-xl leading-none" aria-hidden>
                {meta.emoji}
              </span>
              <span className="text-[11px] font-medium leading-tight">
                {meta.label}
              </span>
            </button>
          ))}
        </div>

        {kind && (
          <p className="text-xs text-muted-foreground -mt-1">
            {HAZARD_KIND_LIST.find((m) => m.kind === kind)?.hint}
          </p>
        )}

        {/* Location */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setUseGps(false)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors",
                !useGps
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              )}
            >
              <MapPin className="w-4 h-4" />
              Map center
            </button>
            <button
              onClick={() => userLocation && setUseGps(true)}
              disabled={!userLocation}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors disabled:opacity-40",
                useGps
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              )}
            >
              <Crosshair className="w-4 h-4" />
              My location
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {lat.toFixed(5)}, {lng.toFixed(5)}
            {!useGps && " · drag the map to move the pin before reporting"}
          </p>
        </div>

        {/* Note */}
        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            placeholder="Add a detail (optional) — e.g. “knee-deep past the traffic light”"
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-1 text-right text-[10px] text-muted-foreground">
            {note.length}/{NOTE_MAX}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          className="w-full"
          disabled={!kind || submitting}
          onClick={handleSubmit}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            "Send report"
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Reports are anonymous and expire on their own. Please don&rsquo;t
          report while driving.
        </p>
      </div>
    </div>
  )
}
