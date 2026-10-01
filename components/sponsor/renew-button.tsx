"use client"

// The pay button on /advertise/renew: starts the Paystack payment for a
// listing renewal and sends the advertiser to Paystack's checkout.

import { useState } from "react"
import { Loader2 } from "lucide-react"

export function RenewButton({ id, token, label }: { id: string; token: string; label: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/sponsor/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ l: id, t: token }),
      })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) throw new Error(data?.error || "Couldn’t start payment.")
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Starting payment…" : label}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
