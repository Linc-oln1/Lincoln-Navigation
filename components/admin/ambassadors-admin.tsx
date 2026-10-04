"use client"

// /admin/ambassadors — promoters with live numbers, add/remove, record payouts.

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import type { AmbassadorStats } from "@/lib/ambassadors"
import { TARGET_SUBSCRIBERS, TARGET_USERS } from "@/lib/ambassadors"

const input = "w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
const btn = "rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"

export function AmbassadorsAdmin() {
  const [rows, setRows] = useState<AmbassadorStats[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/ambassadors", { cache: "no-store" })
    const data = (await res.json().catch(() => null)) as { ambassadors?: AmbassadorStats[]; error?: string } | null
    if (!res.ok || !data?.ambassadors) setError(data?.error || "Couldn’t load promoters.")
    else {
      setError(null)
      setRows(data.ambassadors)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function act(body: Record<string, unknown>) {
    setBusy(true)
    const res = await fetch("/api/admin/ambassadors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!res.ok) window.alert(data.error || "Something went wrong.")
    else {
      if (body.action === "add") setEmail("")
      await load()
    }
  }

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!rows) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void act({ action: "add", email })
        }}
        className="flex gap-2"
      >
        <input className={input} type="email" required placeholder="Promoter's account email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className={btn + " shrink-0"} disabled={busy}>
          Add promoter
        </button>
      </form>

      {rows.length === 0 && <p className="text-sm text-muted-foreground">No promoters yet. They must sign up first, then add their email above.</p>}

      {rows.map((r) => (
        <div key={r.userId} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="m-0 text-sm font-semibold">{r.name || r.email}</p>
              <p className="m-0 text-xs text-muted-foreground">
                {r.email} · code {r.code}
              </p>
            </div>
            <p className="m-0 text-sm">
              <strong>{r.users}</strong>/{TARGET_USERS} users · <strong>{r.subscribers}</strong>/{TARGET_SUBSCRIBERS} subscribers
            </p>
          </div>
          <p className="mt-2 mb-0 text-xs text-muted-foreground">
            Earned GHS {r.earnedGhs} · paid GHS {r.paidGhs} · <strong className="text-foreground">owed GHS {r.owedGhs}</strong> ({r.signups - r.users} unconfirmed sign-ups)
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className={btn}
              disabled={busy || r.owedGhs === 0}
              onClick={() => {
                const note = window.prompt(`Record GHS ${r.owedGhs} as paid to ${r.name || r.email}. Note (e.g. MoMo ref):`, "")
                if (note !== null) void act({ action: "payout", userId: r.userId, amountGhs: r.owedGhs, note })
              }}
            >
              Mark GHS {r.owedGhs} paid
            </button>
            <button
              className={btn}
              disabled={busy}
              onClick={() => window.confirm("Remove this promoter? Their history is kept.") && void act({ action: "remove", userId: r.userId })}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
