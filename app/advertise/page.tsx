"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, MapPin, MousePointerClick, Store } from "lucide-react"
import { ADVERTISE_CONTACT_EMAIL } from "@/lib/monetization"

const OPTIONS = [
  {
    icon: MapPin,
    title: "Sponsored place",
    body: "Your business pinned to the top of its category in Explore Nearby, with a promo line and a link — shown to everyone browsing that part of the map.",
  },
  {
    icon: MousePointerClick,
    title: "Display advertising",
    body: "Standard banner placements on the landing page and inside the app. Billed on impressions or clicks.",
  },
  {
    icon: Store,
    title: "Featured partner",
    body: "A custom pin, branded route card, or launch campaign. Good for hotels, malls, fuel networks and tour operators.",
  },
]

export default function AdvertisePage() {
  const [form, setForm] = useState({
    business: "",
    name: "",
    email: "",
    interest: "Sponsored place",
    message: "",
  })

  const mailto = `mailto:${ADVERTISE_CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Advertising enquiry — ${form.business || "new"}`,
  )}&body=${encodeURIComponent(
    `Business: ${form.business}\nContact: ${form.name}\nEmail: ${form.email}\nInterested in: ${form.interest}\n\n${form.message}`,
  )}`

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to LincolnNavigation
        </Link>

        <header className="mt-8 mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Reach people going places in Ghana
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl">
            LincolnNavigation.com is used by locals and visitors planning real
            trips across the country. Put your business in front of them at the
            moment they&rsquo;re deciding where to go.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {OPTIONS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <form
          className="mt-12 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            window.location.href = mailto
          }}
        >
          <h2 className="text-lg font-semibold">Tell us about your business</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="Business name"
              value={form.business}
              onChange={set("business")}
              className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              required
              placeholder="Your name"
              value={form.name}
              onChange={set("name")}
              className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={set("email")}
              className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <select
              value={form.interest}
              onChange={set("interest")}
              className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
            >
              {OPTIONS.map((o) => (
                <option key={o.title}>{o.title}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Anything else? Location, budget, timing…"
            value={form.message}
            onChange={set("message")}
            rows={4}
            className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 transition"
          >
            Send enquiry
          </button>
          <p className="text-xs text-muted-foreground">
            Opens your email app addressed to {ADVERTISE_CONTACT_EMAIL}. Prefer
            to write directly? That works too.
          </p>
        </form>
      </div>
    </main>
  )
}
