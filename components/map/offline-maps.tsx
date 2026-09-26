"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CloudOff, Download, Lock, Trash2, X } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { cn } from "@/lib/utils"
import {
  OVERVIEW_MAX_ZOOM,
  PRESETS,
  STANDARD_MAX_ZOOM,
  MAX_TILES,
  OfflineDownloadError,
  deleteRegion,
  downloadRegion,
  estimateRegion,
  isOfflineMapsSupported,
  listRegions,
  requestPersistentStorage,
  type BBox,
  type OfflineRegion,
} from "@/lib/offline-maps"

interface OfflineMapsProps {
  isPremium: boolean
  /** [lat, lng] of the map centre, for "around the map view". */
  center: [number, number]
}

const BUTTON =
  "absolute top-[11.75rem] right-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-sm transition-colors"

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`
}

/**
 * Offline maps (Premium): a button under the traffic switch that opens a
 * small sheet for saving map areas to the device. Free users get a
 * padlocked link to the pricing page instead.
 */
export function OfflineMaps({ isPremium, center }: OfflineMapsProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [regions, setRegions] = useState<OfflineRegion[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [percent, setPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const supported = useMemo(() => (typeof window === "undefined" ? true : isOfflineMapsSupported()), [])

  useEffect(() => {
    if (open) setRegions(listRegions())
  }, [open])

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!isPremium) {
    return (
      <a
        href="/pricing"
        title={t("off.premiumOnly")}
        aria-label={t("off.premiumOnly")}
        className={cn(BUTTON, "border-border bg-card/90 text-foreground hover:bg-secondary")}
      >
        <CloudOff className="h-5 w-5" />
        <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-card p-0.5 text-primary" aria-hidden />
      </a>
    )
  }

  const hereBox: BBox = [center[0] - 0.07, center[1] - 0.07, center[0] + 0.07, center[1] + 0.07]
  const areas = [
    { id: "here", name: t("off.here"), bbox: hereBox, maxZoom: STANDARD_MAX_ZOOM },
    ...PRESETS.map((p) => ({
      id: p.id,
      name: p.id === "ghana" ? t("off.overview") : p.name,
      bbox: p.bbox,
      maxZoom: p.overviewOnly ? OVERVIEW_MAX_ZOOM : STANDARD_MAX_ZOOM,
    })),
  ]

  const start = async (area: (typeof areas)[number]) => {
    setError(null)
    setBusyId(area.id)
    setPercent(0)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await requestPersistentStorage()
      await downloadRegion(
        area,
        (p) => setPercent(p.total ? Math.min(100, Math.round((p.done / p.total) * 100)) : 0),
        controller.signal
      )
    } catch (e) {
      if (e instanceof OfflineDownloadError) {
        if (e.code === "too-large") setError(t("off.tooLarge"))
        else if (e.code === "failed") setError(t("off.failed"))
      } else {
        setError(t("off.failed"))
      }
    } finally {
      abortRef.current = null
      setBusyId(null)
      setRegions(listRegions())
    }
  }

  const remove = async (id: string) => {
    await deleteRegion(id)
    setRegions(listRegions())
  }

  const savedIds = new Set(regions.map((r) => r.id))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("off.label")}
        title={t("off.label")}
        className={cn(
          BUTTON,
          regions.length ? "border-primary/60 bg-card/90 text-primary" : "border-border bg-card/90 text-foreground hover:bg-secondary"
        )}
      >
        <CloudOff className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1600] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("off.label")}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busyId) setOpen(false)
          }}
        >
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <CloudOff className="h-5 w-5 text-primary" />
                {t("off.label")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("off.close")}
                className="rounded-lg p-1.5 hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("off.intro")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("off.note")}</p>

            {!supported && <p className="mt-3 text-sm text-destructive">{t("off.unsupported")}</p>}
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("off.saved")}
            </h3>
            {regions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("off.none")}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {regions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(r.bytes)} · {new Date(r.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      disabled={busyId !== null}
                      aria-label={`${t("off.remove")}: ${r.name}`}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("off.available")}
            </h3>
            <ul className="mt-2 space-y-2">
              {areas.map((a) => {
                const est = estimateRegion(a.bbox, a.maxZoom)
                const tooLarge = est.tiles > MAX_TILES
                const active = busyId === a.id
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {active ? t("off.downloading", { percent: percent }) : `~${formatSize(est.bytes)}`}
                      </p>
                    </div>
                    {active ? (
                      <button
                        type="button"
                        onClick={() => abortRef.current?.abort()}
                        className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"
                      >
                        {t("off.cancel")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => start(a)}
                        disabled={!supported || busyId !== null || tooLarge}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {savedIds.has(a.id) ? t("off.update") : t("off.download")}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
