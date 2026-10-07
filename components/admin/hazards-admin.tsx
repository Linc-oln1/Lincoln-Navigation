"use client"

// /admin/hazards — the live crowd hazard reports, newest first, with a
// Remove button on each (moderation for user-submitted content).

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { hazardKindMeta, type Hazard } from "@/lib/hazards"

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export function HazardsAdmin() {
  const [hazards, setHazards] = useState<Hazard[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/hazards", { cache: "no-store" })
    const data = (await res.json().catch(() => null)) as { hazards?: Hazard[]; error?: string } | null
    if (!res.ok || !data?.hazards) setError(data?.error || "Couldn’t load hazards.")
    else {
      setError(null)
      setHazards(data.hazards)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(id: string) {
    setBusy(id)
    const res = await fetch(`/api/admin/hazards/${id}`, { method: "DELETE" })
    setBusy(null)
    setConfirming(null)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error || "Couldn’t remove it.")
      return
    }
    setHazards((list) => (list ?? []).filter((h) => h.id !== id))
  }

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!hazards) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  if (hazards.length === 0) return <p className="text-sm text-muted-foreground">No live hazard reports right now.</p>

  return (
    <ul className="space-y-3">
      {hazards.map((h) => {
        const meta = hazardKindMeta(h.kind)
        return (
          <li key={h.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {meta.emoji} {meta.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {when(h.createdAt)} · {h.location.lat.toFixed(4)}, {h.location.lng.toFixed(4)} · {h.confirmedCount} confirmed ·{" "}
                  {h.clearedCount} cleared
                  {h.noteReports ? ` · note reported ${h.noteReports}×` : ""}
                  {h.noteHidden ? " (hidden)" : ""}
                </p>
                {h.note && <p className="mt-2 text-sm">&ldquo;{h.note}&rdquo;</p>}
              </div>
              {confirming === h.id ? (
                <span className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    disabled={busy === h.id}
                    onClick={() => void remove(h.id)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {busy === h.id ? "Removing…" : "Yes, remove"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === h.id}
                    onClick={() => setConfirming(null)}
                    className="rounded-lg border border-border px-3 py-1.5 hover:bg-secondary"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(h.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
