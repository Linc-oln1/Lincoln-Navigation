"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy, Loader2, MessageCircle, Radio, Share2, Square, X } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { formatDuration } from "@/lib/routing"
import { cn } from "@/lib/utils"

interface ActiveShare {
  viewToken: string
  senderToken: string
  expiresAt: string
  label: string
}

interface TripShareProps {
  /** Device position as [lat, lng]; null until the map has a fix. */
  position: [number, number] | null
  /** The place they're currently heading to, if a route is set. */
  destinationName?: string | null
  /** Hide the button while another full-screen panel is open. */
  hidden?: boolean
}

const STORAGE_KEY = "ln_trip_share"
const SEND_EVERY_MS = 10_000
const DURATIONS = [
  { min: 60, key: "share.d1" },
  { min: 240, key: "share.d4" },
  { min: 720, key: "share.d12" },
] as const

function load(): ActiveShare | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ActiveShare
    return s?.senderToken && s?.viewToken && Date.parse(s.expiresAt) > Date.now() ? s : null
  } catch {
    return null
  }
}

/**
 * Live location sharing: "Share trip" starts a link that friends or family
 * open to watch where you are. No account on either side. It only reports
 * while this page is open — a web page can't track in the background — and
 * says so before starting.
 */
export function TripShare({ position, destinationName, hidden }: TripShareProps) {
  const { t } = useI18n()
  const durationLabels = { min: t("unit.min"), hr: t("unit.hr"), lessThanMin: t("unit.lessThanMin") }
  const [share, setShare] = useState<ActiveShare | null>(null)
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState<number>(240)
  const [name, setName] = useState("")
  const [withDestination, setWithDestination] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const lastSentRef = useRef(0)
  const positionRef = useRef(position)
  positionRef.current = position

  useEffect(() => {
    setShare(load())
    try {
      setName(localStorage.getItem("ln_trip_share_name") ?? "")
    } catch {}
  }, [])

  const clear = useCallback(() => {
    setShare(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  // Countdown; an expired share clears itself.
  useEffect(() => {
    if (!share) return
    const id = setInterval(() => {
      setNow(Date.now())
      if (Date.parse(share.expiresAt) <= Date.now()) clear()
    }, 15_000)
    return () => clearInterval(id)
  }, [share, clear])

  // While sharing, send the latest position every few seconds. A timer (not
  // "when the position changes") so a person standing still keeps showing as
  // live: watchPosition can go quiet when nothing moves.
  useEffect(() => {
    if (!share) return
    const send = () => {
      const here = positionRef.current
      if (!here) return
      lastSentRef.current = Date.now()
      fetch("/api/share/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderToken: share.senderToken, lat: here[0], lng: here[1] }),
      })
        .then((res) => {
          // 410/404: the share has ended or the key is gone — stop cleanly.
          if (res.status === 410 || res.status === 404) clear()
        })
        .catch(() => {})
    }
    const id = setInterval(send, SEND_EVERY_MS)
    return () => clearInterval(id)
  }, [share, clear])

  const start = async () => {
    const here = positionRef.current
    if (!here) return setError(t("share.noLocation"))
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMin: minutes,
          label: name.trim() || undefined,
          destination: withDestination && destinationName ? destinationName : undefined,
          lat: here[0],
          lng: here[1],
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.viewToken) throw new Error(data?.error || t("share.failed"))
      const next: ActiveShare = {
        viewToken: data.viewToken,
        senderToken: data.senderToken,
        expiresAt: data.expiresAt,
        label: name.trim(),
      }
      lastSentRef.current = Date.now()
      setShare(next)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        localStorage.setItem("ln_trip_share_name", name.trim())
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : t("share.failed"))
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    const current = share
    clear()
    setOpen(false)
    if (!current) return
    try {
      await fetch("/api/share/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderToken: current.senderToken }),
      })
    } catch {}
  }

  const link = share ? `${window.location.origin}/track/${share.viewToken}` : ""
  const message = share ? t("share.msg", { url: link }) : ""
  const msLeft = share ? Date.parse(share.expiresAt) - now : 0
  const timeLeft = formatDuration(Math.max(0, msLeft) / 1000, durationLabels)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ text: message })
    } catch {}
  }

  if (hidden && !open) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("share.button")}
        className={cn(
          "absolute bottom-32 left-[7.75rem] z-[1000] flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-lg backdrop-blur-sm transition-colors md:bottom-16",
          share ? "border-green-500/60 bg-green-600 text-white" : "border-border bg-card/90 text-foreground hover:bg-card"
        )}
      >
        {share ? <Radio className="h-4 w-4 animate-pulse" /> : <Share2 className="h-4 w-4 text-primary" />}
        <span>{share ? t("share.active", { time: timeLeft }) : t("share.button")}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1600] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("share.title")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Share2 className="h-5 w-5 text-primary" />
                {t("share.title")}
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="rounded-lg p-1.5 hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!share ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">{t("share.intro")}</p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("share.duration")}</p>
                <div className="mt-2 flex gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.min}
                      type="button"
                      onClick={() => setMinutes(d.min)}
                      aria-pressed={minutes === d.min}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-sm font-medium",
                        minutes === d.min ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t(d.key)}
                    </button>
                  ))}
                </div>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder={t("share.namePh")}
                  aria-label={t("share.name")}
                  className="mt-4 w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
                />

                {destinationName && (
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={withDestination}
                      onChange={(e) => setWithDestination(e.target.checked)}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    <span className="min-w-0 truncate">{t("share.dest", { place: destinationName })}</span>
                  </label>
                )}

                <p className="mt-4 text-xs text-muted-foreground">{t("share.privacy")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("share.keepOpen")}</p>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                  </p>
                )}
                {!position && <p className="mt-3 text-sm text-amber-500">{t("share.noLocation")}</p>}

                <button
                  type="button"
                  onClick={start}
                  disabled={busy || !position}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                  {busy ? t("share.starting") : t("share.start")}
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-green-500">
                  <Radio className="h-4 w-4 animate-pulse" />
                  {t("share.timeLeft", { time: timeLeft })}
                </p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("share.linkLabel")}</p>
                <p className="mt-1 break-all rounded-lg bg-secondary px-3 py-2 font-mono text-xs">{link}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t("share.copied") : t("share.copy")}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <button type="button" onClick={nativeShare} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold">
                      <Share2 className="h-3.5 w-3.5" />
                      {t("share.shareVia")}
                    </button>
                  )}
                </div>

                <p className="mt-4 text-xs text-muted-foreground">{t("share.keepOpen")}</p>

                <button
                  type="button"
                  onClick={stop}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70"
                >
                  <Square className="h-4 w-4" />
                  {t("share.stop")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
