"use client"

// "Buy a sponsored listing" on /advertise: pick a package, describe the
// listing, pay with Paystack. The listing is saved as awaiting payment,
// marked paid on return (/api/sponsor/verify), and goes live once it's
// approved at /admin/sponsors.

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  formatSponsorPrice,
  SPONSOR_DAYS,
  SPONSOR_PACKAGES,
  type SponsorPackageId,
} from "@/lib/monetization"
import { SPONSOR_CATEGORIES } from "@/lib/sponsored-places"
import { LocationPicker, type PickedLocation } from "@/components/sponsor/location-picker"

const input =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"

const RETURN_ERRORS: Record<string, string> = {
  "payment-not-confirmed": "We couldn’t confirm that payment. If you were charged, email us and we’ll sort it out.",
  "payment-not-a-listing": "That payment didn’t match a sponsored listing. Email us and we’ll sort it out.",
  "payment-not-recorded": "Your payment went through but we couldn’t record it. Email us and we’ll activate it by hand.",
}

export function SponsorCheckout({ contactEmail }: { contactEmail: string }) {
  const params = useSearchParams()
  const paid = params.get("paid") === "1"
  const returnError = RETURN_ERRORS[params.get("error") ?? ""]

  const [pkg, setPkg] = useState<SponsorPackageId>("local")
  const [location, setLocation] = useState<PickedLocation | null>(null)
  const [form, setForm] = useState({
    name: "",
    category: "",
    tagline: "",
    url: "",
    contactName: "",
    email: "",
    phone: "",
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    if (!location) {
      setError("Search for your business address and pick it from the list.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/sponsor/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, package: pkg, ...location }),
      })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) throw new Error(data?.error || "Couldn’t start payment.")
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t start payment.")
      setBusy(false)
    }
  }

  if (paid) {
    return (
      <section id="buy" className="mt-12 rounded-2xl border border-primary/30 bg-primary/[0.06] p-6">
        <h2 className="text-lg font-semibold">Payment received — thank you!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&rsquo;ll check your listing and switch it on, usually within one working day. It then
          runs for {SPONSOR_DAYS} days from the day it goes live. Questions? Email{" "}
          <a href={`mailto:${contactEmail}`} className="font-semibold text-primary hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </section>
    )
  }

  return (
    <section id="buy" className="mt-12">
      <h2 className="text-2xl font-bold tracking-tight">Get a sponsored listing</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {`Your business pinned to the top of its category in Explore Nearby, labelled “Sponsored”. Pay once for ${SPONSOR_DAYS} days — no auto-renewal. We review every listing before it goes live, and you get a report of views and clicks.`}
      </p>

      {returnError && (
        <p className="mt-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm">{returnError}</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SPONSOR_PACKAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPkg(p.id)}
            aria-pressed={pkg === p.id}
            className={cn(
              "rounded-2xl border bg-card p-5 text-left transition-colors",
              pkg === p.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.label}</span>
              {pkg === p.id && <Check className="h-4 w-4 text-primary" />}
            </div>
            <p className="mt-2 text-2xl font-extrabold">
              {formatSponsorPrice(p.pricePesewas)}
              <span className="text-sm font-medium text-muted-foreground"> / {SPONSOR_DAYS} days</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
          </button>
        ))}
      </div>

      <form onSubmit={pay} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <input required placeholder="Business name" value={form.name} onChange={set("name")} className={input} maxLength={80} />
          <select required value={form.category} onChange={set("category")} className={input}>
            <option value="" disabled>
              Category to appear in
            </option>
            {SPONSOR_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <LocationPicker value={location} onChange={setLocation} inputClassName={input} />

        <input
          placeholder="Promo line (optional) — e.g. “Free delivery in Osu”"
          value={form.tagline}
          onChange={set("tagline")}
          className={input}
          maxLength={90}
        />
        <input
          type="url"
          placeholder="Website or menu link (optional) — https://…"
          value={form.url}
          onChange={set("url")}
          className={input}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <input placeholder="Your name" value={form.contactName} onChange={set("contactName")} className={input} />
          <input required type="email" placeholder="Email for receipt" value={form.email} onChange={set("email")} className={input} />
          <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={set("phone")} className={input} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Pay {formatSponsorPrice(SPONSOR_PACKAGES.find((p) => p.id === pkg)!.pricePesewas)} with Paystack
        </button>
        <p className="text-xs text-muted-foreground">
          Mobile money and cards via Paystack. By paying you agree to our{" "}
          <a href="/advertising-policy" className="underline">advertising policy</a>.
        </p>
      </form>
    </section>
  )
}
