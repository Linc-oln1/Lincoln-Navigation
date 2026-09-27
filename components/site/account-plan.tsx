"use client"

import { useState } from "react"
import Link from "next/link"
import { usePremium } from "@/hooks/use-premium"

/** The signed-in user's plan, plus a way to get a paid plan back on this device. */
export function AccountPlanRow() {
  const { isPremium, isPro, expiresAt } = usePremium()
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const plan = isPro ? "Pro" : isPremium ? "Premium" : "Free"
  const until = expiresAt ? new Date(expiresAt).toLocaleDateString() : null
  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000) : null

  async function restore(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/billing/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reference.trim() ? { reference: reference.trim() } : {}),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 429) setMessage("Too many attempts. Try again in a few minutes.")
      else if (!res.ok) setMessage("Couldn\u2019t check right now. Try again.")
      else if (data?.restored) {
        setMessage(`Restored: ${data.plan === "pro" ? "Pro" : "Premium"} plan.`)
        window.dispatchEvent(new Event("focus")) // usePremium re-reads the cookie
      } else {
        setMessage(
          reference.trim()
            ? "We couldn\u2019t find an active plan for that reference."
            : "No active plan found for your account. If you paid with a different email, enter your payment reference."
        )
        setOpen(true)
      }
    } catch {
      setMessage("Couldn\u2019t check right now. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <dt className="text-sm text-muted-foreground">Plan</dt>
        <dd className="text-right">
          <span className="text-sm font-medium">{plan}</span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isPremium ? (
              <>
                Active{until ? ` until ${until}` : ""}
                {daysLeft !== null && daysLeft <= 7 ? ` (${daysLeft <= 0 ? "ends today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`})` : ""}.
              </>
            ) : (
              <>
                Upgrade for Live View, offline maps, voice and more.{" "}
                <Link href="/pricing" className="font-semibold text-primary hover:underline">
                  See plans
                </Link>
              </>
            )}
          </p>
        </dd>
      </div>

      {isPremium && daysLeft !== null && daysLeft <= 7 && (
        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs">
          Your plan ends soon and doesn&rsquo;t renew by itself.{" "}
          <Link href="/pricing" className="font-semibold text-primary hover:underline">
            Renew on the plans page
          </Link>
          .
        </p>
      )}

      {!isPremium && (
        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => restore()}
            disabled={busy}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/70 disabled:opacity-60"
          >
            {busy ? "Checking…" : "Restore my plan"}
          </button>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Paid before? This finds your plan and puts it back on this device.
          </p>
          <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 text-[11px] font-semibold text-primary hover:underline">
            Paid with a different email?
          </button>
          {open && (
            <form onSubmit={restore} className="mt-2 flex gap-2">
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Payment reference from your receipt"
                className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-xs outline-none focus:border-primary"
              />
              <button type="submit" disabled={busy || !reference.trim()} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                Restore
              </button>
            </form>
          )}
          {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  )
}
