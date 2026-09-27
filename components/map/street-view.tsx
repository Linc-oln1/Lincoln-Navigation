"use client"

import { useEffect, useRef, useState } from "react"
import { ExternalLink, Loader2, X } from "lucide-react"
import "mapillary-js/dist/mapillary.css"
import { useI18n } from "@/components/i18n/language-provider"
import { MAPILLARY_TOKEN, imagesNear, pickBest, type NearbyImage } from "@/lib/mapillary"

interface StreetViewProps {
  lat: number
  lng: number
  title: string
  onClose: () => void
}

// Look close first; widen once before giving up (a place's pin is often on the
// building, a little off the road the photos were taken from).
const RADII_M = [60, 200] as const
const LOAD_TIMEOUT_MS = 20_000

type Phase = "searching" | "loading" | "ready" | "none" | "error"

/**
 * Street-level photos (Mapillary) at a place. Drag to look around, tap the
 * arrows to move along the street; 360° photos let you turn all the way
 * round. The viewer library is only downloaded when this opens.
 */
export function StreetView({ lat, lng, title, onClose }: StreetViewProps) {
  const { t } = useI18n()
  const container = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>("searching")
  const [image, setImage] = useState<NearbyImage | null>(null)
  const [radius, setRadius] = useState<number>(RADII_M[0])

  useEffect(() => {
    const controller = new AbortController()
    let viewer: { remove: () => void; on: (t: string, f: (e: unknown) => void) => void; moveTo: (id: string) => Promise<unknown> } | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    async function run() {
      try {
        let best: NearbyImage | null = null
        for (const r of RADII_M) {
          const found = await imagesNear(lat, lng, r, controller.signal)
          best = pickBest(found)
          if (best) {
            setRadius(r)
            break
          }
          setRadius(r)
        }
        if (cancelled) return
        if (!best) return setPhase("none")

        setImage(best)
        setPhase("loading")
        // The viewer is a large library: load it only now.
        const { Viewer } = await import("mapillary-js")
        if (cancelled || !container.current) return

        const v = new Viewer({
          accessToken: MAPILLARY_TOKEN,
          container: container.current,
          imageId: best.id,
          component: { cover: false },
        })
        viewer = v as unknown as typeof viewer
        v.on("image", (e: unknown) => {
          const id = (e as { image?: { id?: string } })?.image?.id
          clearTimeout(timer)
          setPhase("ready")
          // Follow the viewer as the person moves along the street.
          if (id) setImage((cur) => (cur && cur.id === id ? cur : { ...(cur ?? best!), id }))
        })
        timer = setTimeout(() => !cancelled && setPhase((p) => (p === "loading" ? "error" : p)), LOAD_TIMEOUT_MS)
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return
        setPhase("error")
      }
    }
    void run()

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timer)
      try {
        viewer?.remove()
      } catch {}
    }
  }, [lat, lng])

  return (
    <div className="fixed inset-0 z-[1700] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={t("street.title")}>
      <div className="flex items-center gap-3 bg-card/95 px-4 py-3 text-foreground">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{t("street.title")}</p>
        </div>
        {image && (
          <a
            href={`https://www.mapillary.com/app/?pKey=${encodeURIComponent(image.id)}&focus=photo`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold sm:inline-flex"
          >
            {t("street.open")}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
        <button type="button" onClick={onClose} aria-label={t("common.close")} className="rounded-lg p-1.5 hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* The viewer draws into this element. */}
        <div ref={container} className="absolute inset-0" />

        {(phase === "searching" || phase === "loading") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-sm text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            {t("street.loading")}
          </div>
        )}
        {phase === "none" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black p-8 text-center text-sm text-white/80">
            {t("street.none", { m: radius })}
          </div>
        )}
        {phase === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black p-8 text-center text-sm text-white/80">{t("street.error")}</div>
        )}
      </div>

      <p className="bg-card/95 px-4 py-2 text-[11px] text-muted-foreground">{t("street.credit")}</p>
    </div>
  )
}
