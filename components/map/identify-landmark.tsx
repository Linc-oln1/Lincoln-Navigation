"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, Loader2, Lock, ScanEye, Search, X } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { cn } from "@/lib/utils"

interface IdentifyLandmarkProps {
  isPremium: boolean
  /** Device position as [lat, lng], sent as a hint to narrow the candidates. */
  position: [number, number] | null
  /** Show the identified place in the search panel. */
  onSearch: (query: string) => void
}

interface Result {
  identified: boolean
  name: string
  kind: string
  description: string
  clues: string
  confidence: "high" | "medium" | "low"
}

const BUTTON =
  "absolute top-[23.75rem] right-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-sm transition-colors"
const CONSENT_KEY = "ln_identify_consent"
const MAX_SIDE = 1024

type Phase = "consent" | "camera" | "sending" | "result" | "error"

/**
 * Premium: point the camera at a landmark or building and tap. The photo is
 * sent to an AI service to name it — only after the person has said yes, and
 * only the one photo they take. Nothing is kept. Hidden until the server has
 * an API key.
 */
export function IdentifyLandmark({ isPremium, position, onSearch }: IdentifyLandmarkProps) {
  const { t, lang } = useI18n()
  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("consent")
  const [result, setResult] = useState<Result | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/identify")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setEnabled(Boolean(d?.enabled)))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setMessage(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(t("identify.noCamera"))
      return setPhase("error")
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      streamRef.current = stream
      setPhase("camera")
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError")
      setMessage(denied ? t("identify.cameraBlocked") : t("identify.noCamera"))
      setPhase("error")
    }
  }, [t])

  const close = useCallback(() => {
    stopCamera()
    setOpen(false)
    setResult(null)
  }, [stopCamera])

  useEffect(() => stopCamera, [stopCamera])

  // Attach the stream once the <video> exists (it only mounts in the camera phase).
  useEffect(() => {
    if (phase !== "camera") return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    void video.play().catch(() => {})
  }, [phase])

  const openSheet = () => {
    setOpen(true)
    setResult(null)
    setMessage(null)
    let agreed = false
    try {
      agreed = localStorage.getItem(CONSENT_KEY) === "1"
    } catch {}
    if (agreed) void startCamera()
    else setPhase("consent")
  }

  const agree = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "1")
    } catch {}
    void startCamera()
  }

  const capture = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    // Shrink before sending: one small JPEG is all the model needs.
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const image = canvas.toDataURL("image/jpeg", 0.72).split(",")[1]
    stopCamera()
    setPhase("sending")
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, lat: position?.[0], lng: position?.[1], lang }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 402) throw new Error(t("identify.premiumOnly"))
      if (!res.ok || !data) throw new Error(data?.error || t("identify.failed"))
      setResult(data as Result)
      setPhase("result")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("identify.failed"))
      setPhase("error")
    }
  }

  // Nothing to show until the server has a key.
  if (!enabled) return null

  if (!isPremium) {
    return (
      <a
        href="/pricing"
        title={t("identify.premiumOnly")}
        aria-label={t("identify.premiumOnly")}
        className={cn(BUTTON, "border-border bg-card/90 text-foreground hover:bg-secondary")}
      >
        <ScanEye className="h-5 w-5" />
        <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-card p-0.5 text-primary" aria-hidden />
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label={t("identify.label")}
        title={t("identify.label")}
        className={cn(BUTTON, "border-border bg-card/90 text-foreground hover:bg-secondary")}
      >
        <ScanEye className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[1700] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={t("identify.label")}>
          <div className="flex items-center gap-3 bg-black/80 px-4 py-3">
            <p className="flex-1 text-sm font-semibold">{t("identify.label")}</p>
            <button type="button" onClick={close} aria-label={t("common.close")} className="rounded-lg p-1.5 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            {phase === "consent" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <ScanEye className="h-10 w-10 text-primary" />
                <p className="max-w-sm text-sm">{t("identify.intro")}</p>
                <p className="max-w-sm text-xs text-white/70">{t("identify.consent")}</p>
                <button type="button" onClick={agree} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                  {t("identify.agree")}
                </button>
              </div>
            )}

            {phase === "camera" && (
              <>
                <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
                <p className="absolute inset-x-0 top-3 mx-auto w-fit max-w-[90%] rounded-full bg-black/60 px-4 py-1.5 text-center text-xs">{t("identify.aim")}</p>
                <button
                  type="button"
                  onClick={capture}
                  aria-label={t("identify.take")}
                  className="absolute bottom-8 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-white/20 hover:bg-white/30"
                >
                  <Camera className="h-6 w-6" />
                </button>
              </>
            )}

            {phase === "sending" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm">
                <Loader2 className="h-7 w-7 animate-spin" />
                {t("identify.working")}
              </div>
            )}

            {phase === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <p role="alert" className="max-w-sm text-sm">{message}</p>
                <button type="button" onClick={() => void startCamera()} className="rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold hover:bg-white/25">
                  {t("identify.retry")}
                </button>
              </div>
            )}

            {phase === "result" && result && (
              <div className="absolute inset-0 overflow-y-auto p-5">
                <div className="mx-auto max-w-md rounded-2xl bg-card p-5 text-foreground">
                  {result.identified ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {t(`identify.conf.${result.confidence}` as never)}
                      </p>
                      <h2 className="mt-1 text-xl font-bold">{result.name}</h2>
                      {result.kind && <p className="text-sm text-muted-foreground">{result.kind}</p>}
                    </>
                  ) : (
                    <h2 className="text-lg font-bold">{t("identify.notSure")}</h2>
                  )}
                  {result.description && <p className="mt-3 text-sm">{result.description}</p>}
                  {result.clues && <p className="mt-2 text-xs text-muted-foreground">{result.clues}</p>}
                  <p className="mt-3 text-[11px] text-muted-foreground">{t("identify.disclaimer")}</p>

                  <div className="mt-4 flex gap-2">
                    {result.identified && (
                      <button
                        type="button"
                        onClick={() => {
                          close()
                          onSearch(result.name)
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                      >
                        <Search className="h-4 w-4" />
                        {t("identify.find")}
                      </button>
                    )}
                    <button type="button" onClick={() => void startCamera()} className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70">
                      {t("identify.another")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
