"use client"

import { useState } from "react"
import { BUSINESS_EMAIL, BUSINESS_SEGMENTS } from "@/lib/business"

const SIZES = [
  "Just exploring",
  "Pilot (up to 10 vehicles or users)",
  "10 – 100",
  "100 – 1,000",
  "1,000+",
]

const inputClass =
  "w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"

/**
 * Same approach as the Advertise page: the form opens the visitor's email
 * app with everything filled in, addressed to BUSINESS_EMAIL.
 */
export function BusinessForm({ initialType }: { initialType?: string }) {
  const [form, setForm] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    type: initialType ?? BUSINESS_SEGMENTS[0].title,
    size: SIZES[0],
    message: "",
  })

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const mailto = `mailto:${BUSINESS_EMAIL}?subject=${encodeURIComponent(
    `Business enquiry — ${form.type} — ${form.company || "new"}`,
  )}&body=${encodeURIComponent(
    `Company: ${form.company}\nContact: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nWe are a: ${form.type}\nScale: ${form.size}\n\n${form.message}`,
  )}`

  return (
    <form
      id="talk-to-us"
      className="scroll-mt-24 space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        window.location.href = mailto
      }}
    >
      <h2 className="text-xl font-semibold">Talk to us</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          required
          placeholder="Company or organisation"
          value={form.company}
          onChange={set("company")}
          className={inputClass}
        />
        <input
          required
          placeholder="Your name"
          value={form.name}
          onChange={set("name")}
          className={inputClass}
        />
        <input
          required
          type="email"
          placeholder="Work email"
          value={form.email}
          onChange={set("email")}
          className={inputClass}
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={set("phone")}
          className={inputClass}
        />
        <label className="text-xs text-muted-foreground">
          We are a…
          <select value={form.type} onChange={set("type")} className={`${inputClass} mt-1`}>
            {BUSINESS_SEGMENTS.map((s) => (
              <option key={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Roughly how many vehicles or users?
          <select value={form.size} onChange={set("size")} className={`${inputClass} mt-1`}>
            {SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        placeholder="What are you trying to do? Regions, vehicle types, timing…"
        value={form.message}
        onChange={set("message")}
        rows={5}
        className={inputClass}
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
      >
        Send enquiry
      </button>
      <p className="text-xs text-muted-foreground">
        Opens your email app addressed to{" "}
        <a href={`mailto:${BUSINESS_EMAIL}`} className="underline">
          {BUSINESS_EMAIL}
        </a>
        . Prefer to write directly? That works too.
      </p>
    </form>
  )
}
