"use client"

import { useEffect } from "react"
import { useI18n } from "@/components/i18n/language-provider"

/**
 * "Stop navigation?" confirmation shown before anything that would end a
 * running live trip. Keeping the trip is the default choice; Escape or a
 * tap outside also keeps it.
 */
export function StopNavigationDialog({
  open,
  description,
  stopLabel,
  onKeep,
  onStop,
}: {
  open: boolean
  description: string
  stopLabel: string
  onKeep: () => void
  onStop: () => void
}) {
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onKeep()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onKeep])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4"
      onClick={onKeep}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="stop-nav-title"
        aria-describedby="stop-nav-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <h2 id="stop-nav-title" className="text-lg font-semibold text-foreground">
          {t("stop.title")}
        </h2>
        <p id="stop-nav-desc" className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary active:scale-95"
          >
            {stopLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onKeep}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:scale-95"
          >
            {t("stop.keep")}
          </button>
        </div>
      </div>
    </div>
  )
}
