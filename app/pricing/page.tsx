"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react"
import {
  FREE_FEATURES,
  PREMIUM_ENABLED,
  PREMIUM_FEATURES,
  formatPremiumPrice,
} from "@/lib/monetization"
import { usePremium } from "@/hooks/use-premium"

export default function PricingPage() {
  const params = useSearchParams()
  const { isPremium, expiresAt } = usePremium()
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const welcome = params.get("welcome") === "1"
  const paymentError = params.get("error")

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.")
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to LincolnNavigation
        </Link>

        <header className="mt-8 mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Simple pricing
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl">
            The map, search and directions are free forever. Premium removes
            ads and unlocks offline maps and voice navigation for the whole
            country.
          </p>
        </header>

        {welcome && (
          <div className="mb-8 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
            🎉 You&rsquo;re on Premium. Thank you for supporting the project!
          </div>
        )}
        {paymentError && (
          <div className="mb-8 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            We couldn&rsquo;t confirm that payment ({paymentError}). You have not
            been charged for an incomplete transaction.
          </div>
        )}
        {isPremium && !welcome && (
          <div className="mb-8 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
            Your Premium plan is active
            {expiresAt
              ? ` until ${new Date(expiresAt).toLocaleDateString()}`
              : ""}
            .
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Free</h2>
            <p className="mt-1 text-2xl font-bold">
              GHS 0
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / forever
              </span>
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/app"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-secondary/80 transition-colors"
            >
              Open the map
            </Link>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border border-primary/50 bg-card p-6 ring-1 ring-primary/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Premium</h2>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {formatPremiumPrice()}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / month
              </span>
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>

            {isPremium ? (
              <p className="mt-6 rounded-xl bg-primary/10 px-4 py-2.5 text-center text-sm font-semibold text-primary">
                Active — you&rsquo;re all set
              </p>
            ) : PREMIUM_ENABLED ? (
              <form onSubmit={startCheckout} className="mt-6 space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 transition disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? "Starting checkout…" : "Get Premium"}
                </button>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                <p className="text-center text-[11px] text-muted-foreground">
                  Secure payment via Paystack · cancel anytime
                </p>
              </form>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-2.5 text-center text-xs text-muted-foreground">
                Premium checkout isn&rsquo;t live yet — add your Paystack keys to
                enable it (see docs/MONETIZATION.md).
              </p>
            )}
          </div>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Run a business in Ghana?{" "}
          <Link href="/advertise" className="font-semibold text-primary hover:underline">
            Advertise or sponsor a place →
          </Link>
        </p>
      </div>
    </main>
  )
}
