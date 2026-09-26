"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, Copy, Eye, EyeOff, Link2, Loader2, Lock, MessageCircle, Plus, Trash2, Truck, X } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { useSession } from "@/hooks/use-session"
import { cn } from "@/lib/utils"

interface FleetVehicle {
  id: string
  name: string
  plate: string | null
  kind: string
  last_lat: number | null
  last_lng: number | null
  last_speed: number | null
  last_seen: string | null
}

interface FleetPanelProps {
  isPro: boolean
  /** Vehicles to pin on the map (null = stop tracking and clear the pins). */
  onTrack: (vehicles: { position: [number, number]; title: string; description: string }[] | null) => void
  onCenter: (position: [number, number]) => void
}

const BUTTON =
  "absolute top-[20.75rem] right-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-sm transition-colors"
const POLL_MS = 10_000
const LIVE_MS = 60_000
const RECENT_MS = 10 * 60_000
const KINDS = ["car", "van", "truck", "motorcycle", "bus", "bicycle"] as const

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min`
  return `${Math.round(m / 60)} h`
}

/**
 * Fleet tools (Pro): register vehicles, send each driver a link that shares
 * their phone's location, and see every vehicle's latest position on the map.
 * Needs a signed-in account (the vehicles belong to it).
 */
export function FleetPanel({ isPro, onTrack, onCenter }: FleetPanelProps) {
  const { t } = useI18n()
  const { user, loading: sessionLoading, authEnabled } = useSession()
  const [open, setOpen] = useState(false)
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tracking, setTracking] = useState(false)
  const [clockSkew, setClockSkew] = useState(0)
  const [, forceTick] = useState(0)
  const [links, setLinks] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [plate, setPlate] = useState("")
  const [kind, setKind] = useState<(typeof KINDS)[number]>("car")
  const [adding, setAdding] = useState(false)
  const centeredRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/fleet/vehicles", { cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(
          res.status === 401 ? t("fleet.signIn") : res.status === 402 ? t("fleet.proOnly") : data?.error || t("fleet.loadFailed")
        )
        return
      }
      setError(null)
      setVehicles(data.vehicles)
      if (data.serverTime) setClockSkew(Date.now() - new Date(data.serverTime).getTime())
    } catch {
      setError(t("fleet.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  const canUse = isPro && Boolean(user)

  // Load when the sheet opens; keep fresh while it's open or tracking.
  useEffect(() => {
    if (!canUse || !(open || tracking)) return
    setLoading(true)
    void load()
    const id = setInterval(() => {
      void load()
      forceTick((n) => n + 1)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [canUse, open, tracking, load])

  const ageOf = useCallback((v: FleetVehicle) => (v.last_seen ? Date.now() - clockSkew - new Date(v.last_seen).getTime() : null), [clockSkew])

  // Pins for the map while tracking.
  useEffect(() => {
    if (!tracking) return
    const located = vehicles.filter((v) => v.last_lat != null && v.last_lng != null && (ageOf(v) ?? Infinity) < RECENT_MS)
    onTrack(
      located.map((v) => {
        const age = ageOf(v) ?? 0
        return {
          position: [v.last_lat as number, v.last_lng as number] as [number, number],
          title: `🚚 ${v.name}`,
          description: `${v.plate ? v.plate + " · " : ""}${age < LIVE_MS ? t("fleet.live") : t("fleet.lastSeen", { ago: ago(age) })}`,
        }
      })
    )
    if (!centeredRef.current && located.length) {
      centeredRef.current = true
      onCenter([located[0].last_lat as number, located[0].last_lng as number])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking, vehicles])

  const toggleTracking = () => {
    if (tracking) {
      setTracking(false)
      centeredRef.current = false
      onTrack(null)
    } else {
      setTracking(true)
    }
  }

  const linkFor = (token: string) => `${window.location.origin}/drive/${token}`

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800)
    } catch {}
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch("/api/fleet/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, plate, kind }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || t("fleet.loadFailed"))
      setLinks((prev) => ({ ...prev, [data.vehicle.id]: data.driverToken }))
      setVehicles((prev) => [...prev, data.vehicle])
      setName("")
      setPlate("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("fleet.loadFailed"))
    } finally {
      setAdding(false)
    }
  }

  const resetLink = async (id: string) => {
    const res = await fetch(`/api/fleet/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetLink: true }),
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.driverToken) {
      setLinks((prev) => ({ ...prev, [id]: data.driverToken }))
      setVehicles((prev) => prev.map((v) => (v.id === id ? data.vehicle : v)))
    }
  }

  const remove = async (id: string) => {
    const res = await fetch(`/api/fleet/vehicles/${id}`, { method: "DELETE" })
    if (res.ok) {
      setVehicles((prev) => prev.filter((v) => v.id !== id))
      setLinks((prev) => {
        const { [id]: _gone, ...rest } = prev
        return rest
      })
    }
  }

  if (!isPro) {
    return (
      <a
        href="/pricing"
        title={t("fleet.proOnly")}
        aria-label={t("fleet.proOnly")}
        className={cn(BUTTON, "border-border bg-card/90 text-foreground hover:bg-secondary")}
      >
        <Truck className="h-5 w-5" />
        <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-card p-0.5 text-primary" aria-hidden />
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("fleet.label")}
        title={t("fleet.label")}
        className={cn(
          BUTTON,
          tracking ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/90 text-foreground hover:bg-secondary"
        )}
      >
        <Truck className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1600] flex items-end justify-center bg-black/50 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("fleet.title")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Truck className="h-5 w-5 text-primary" />
                {t("fleet.title")}
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="rounded-lg p-1.5 hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("fleet.intro")}</p>

            {!authEnabled || (!sessionLoading && !user) ? (
              <div className="mt-4 rounded-xl border border-border p-4 text-sm">
                <p>{t("fleet.signIn")}</p>
                <Link href="/login" className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  {t("nav.signIn")}
                </Link>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleTracking}
                  aria-pressed={tracking}
                  className={cn(
                    "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
                    tracking ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"
                  )}
                >
                  {tracking ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {tracking ? t("fleet.hide") : t("fleet.show")}
                </button>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("fleet.vehicles")}</h3>
                {loading && vehicles.length === 0 ? (
                  <Loader2 className="mt-3 h-4 w-4 animate-spin text-muted-foreground" />
                ) : vehicles.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("fleet.none")}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {vehicles.map((v) => {
                      const age = ageOf(v)
                      const live = age !== null && age < LIVE_MS && v.last_lat != null
                      const recent = !live && age !== null && age < RECENT_MS && v.last_lat != null
                      const token = links[v.id]
                      const href = token ? linkFor(token) : null
                      return (
                        <li key={v.id} className="rounded-xl bg-secondary px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn("h-2.5 w-2.5 flex-shrink-0 rounded-full", live ? "bg-green-500" : recent ? "bg-amber-500" : "bg-muted-foreground/40")}
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {v.name}
                                {v.plate && <span className="ml-2 text-xs font-normal text-muted-foreground">{v.plate}</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {live
                                  ? t("fleet.live")
                                  : recent
                                    ? t("fleet.lastSeen", { ago: ago(age as number) })
                                    : t("fleet.offline")}
                                {live && v.last_speed != null && v.last_speed > 0.5 ? ` · ${Math.round(v.last_speed * 3.6)} km/h` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => resetLink(v.id)}
                              aria-label={`${t("fleet.newLink")}: ${v.name}`}
                              title={t("fleet.newLink")}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground"
                            >
                              <Link2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(v.id)}
                              aria-label={`${t("fleet.remove")}: ${v.name}`}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {href && (
                            <div className="mt-2 rounded-lg bg-card p-2.5">
                              <p className="text-xs text-muted-foreground">{t("fleet.linkOnce")}</p>
                              <p className="mt-1 break-all text-xs font-mono">{href}</p>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => copy(v.id, href)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold"
                                >
                                  {copied === v.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                  {copied === v.id ? t("fleet.copied") : t("fleet.copy")}
                                </button>
                                <a
                                  href={`https://wa.me/?text=${encodeURIComponent(`${v.name}: ${href}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  WhatsApp
                                </a>
                              </div>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                <form onSubmit={add} className="mt-5 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("fleet.add")}</h3>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("fleet.namePh")}
                    maxLength={60}
                    className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <input
                      value={plate}
                      onChange={(e) => setPlate(e.target.value)}
                      placeholder={t("fleet.platePh")}
                      maxLength={20}
                      className="min-w-0 flex-1 rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
                    />
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}
                      aria-label={t("fleet.kind")}
                      className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary"
                    >
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {t(`fleet.kind.${k}` as never)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={adding || !name.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {t("fleet.addBtn")}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
