"use client"

import { useState } from "react"
import { Check, ChevronDown, ChevronUp, Flag, Navigation, SkipForward, X } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { formatDuration } from "@/lib/routing"
import { cn } from "@/lib/utils"

export interface RunStop {
  id: string
  name: string
  lat: number
  lng: number
  /** Driving time from the previous stop, seconds (from the optimizer). */
  legSeconds: number
  status: "todo" | "done" | "skipped"
}

export interface Run {
  startedAt: string
  stops: RunStop[]
}

interface RunCardProps {
  run: Run
  onChange: (run: Run) => void
  onNavigate: (stop: RunStop, index: number) => void
  onEnd: () => void
}

/**
 * Professional navigation (Pro): a delivery / service run made from the route
 * planner. Shows the next stop, opens turn-by-turn directions to it, and
 * keeps count as stops are done or skipped. Stays on the device between visits.
 */
export function RunCard({ run, onChange, onNavigate, onEnd }: RunCardProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)

  const nextIndex = run.stops.findIndex((s) => s.status === "todo")
  const finished = nextIndex === -1
  const next = finished ? null : run.stops[nextIndex]
  const doneCount = run.stops.filter((s) => s.status === "done").length
  const skippedCount = run.stops.filter((s) => s.status === "skipped").length
  const remainingSeconds = run.stops.filter((s) => s.status === "todo").reduce((n, s) => n + s.legSeconds, 0)

  const mark = (index: number, status: RunStop["status"]) =>
    onChange({ ...run, stops: run.stops.map((s, i) => (i === index ? { ...s, status } : s)) })

  return (
    <div
      className="absolute bottom-24 left-4 right-4 z-[1050] mx-auto max-w-md rounded-2xl border border-border bg-card/95 p-4 text-foreground shadow-2xl backdrop-blur-xl md:bottom-6 md:left-auto md:right-24 md:mx-0"
      role="region"
      aria-label={t("run.title")}
    >
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-primary" aria-hidden />
        <p className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {finished
            ? t("run.complete")
            : t("run.progress", { n: doneCount + skippedCount + 1, total: run.stops.length })}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-label={t("run.stops")}
          className="rounded-lg p-1 hover:bg-secondary"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onEnd} aria-label={t("run.end")} title={t("run.end")} className="rounded-lg p-1 hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>

      {finished ? (
        <p className="mt-2 text-sm">
          {t("run.summary", { done: doneCount, skipped: skippedCount })}
        </p>
      ) : (
        <>
          <p className="mt-2 truncate text-base font-semibold">{next?.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("run.left", { time: formatDuration(remainingSeconds) })}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => next && onNavigate(next, nextIndex)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Navigation className="h-4 w-4" />
              {t("run.navigate")}
            </button>
            <button
              type="button"
              onClick={() => mark(nextIndex, "done")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2.5 text-sm font-semibold hover:bg-secondary/70"
            >
              <Check className="h-4 w-4" />
              {t("run.done")}
            </button>
            <button
              type="button"
              onClick={() => mark(nextIndex, "skipped")}
              aria-label={t("run.skip")}
              title={t("run.skip")}
              className="flex items-center justify-center rounded-xl bg-secondary px-3 py-2.5 hover:bg-secondary/70"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {expanded && (
        <ol className="mt-3 max-h-48 space-y-1 overflow-y-auto">
          {run.stops.map((s, i) => (
            <li key={s.id + i} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm">
              <span
                className={cn(
                  "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  s.status === "done" ? "bg-green-500 text-white" : s.status === "skipped" ? "bg-muted-foreground/40" : "bg-primary/20 text-primary"
                )}
              >
                {s.status === "done" ? "✓" : i + 1}
              </span>
              <span className={cn("min-w-0 flex-1 truncate", s.status !== "todo" && "text-muted-foreground line-through")}>{s.name}</span>
              {s.status !== "todo" && (
                <button type="button" onClick={() => mark(i, "todo")} className="text-xs text-primary hover:underline">
                  {t("run.undo")}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {finished && (
        <button
          type="button"
          onClick={onEnd}
          className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t("run.close")}
        </button>
      )}
    </div>
  )
}
