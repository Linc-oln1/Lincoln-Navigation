"use client"

import { useState } from "react"
import {
  BUSINESS_EMAIL,
  BUSINESS_INTERESTS,
  BUSINESS_SEGMENTS,
  BUSINESS_SIZES,
} from "@/lib/business"

export interface Lead {
  type: string
  interest: string
  size: string
}

const inputClass =
  "w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-500 outline-none backdrop-blur focus:border-[#3b3596] focus:bg-white"

/**
 * Same approach as the Advertise page: the form opens the visitor's email
 * app with everything filled in, addressed to BUSINESS_EMAIL. The customer
 * type, interest and size are shared with the hero's filter bar.
 */
export function BusinessForm({
  lead,
  onLeadChange,
}: {
  lead: Lead
  onLeadChange: (patch: Partial<Lead>) => void
}) {
  const [form, setForm] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    message: "",
  })

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const mailto = `mailto:${BUSINESS_EMAIL}?subject=${encodeURIComponent(
    `Business enquiry — ${lead.type} — ${form.company || "new"}`,
  )}&body=${encodeURIComponent(
    `Company: ${form.company}\nContact: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nWe are a: ${lead.type}\nInterested in: ${lead.interest}\nScale: ${lead.size}\n\n${form.message}`,
  )}`

  return (
    <form
      id="talk-to-us"
      className="scroll-mt-24 space-y-4 rounded-[2rem] border border-white/70 bg-white/60 p-6 shadow-[0_8px_40px_rgba(30,41,59,0.12)] backdrop-blur-2xl sm:p-8"
      onSubmit={(e) => {
        e.preventDefault()
        window.location.href = mailto
      }}
    >
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Talk to us</h2>
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
        <label className="text-xs font-medium text-slate-600">
          We are a…
          <select
            value={lead.type}
            onChange={(e) => onLeadChange({ type: e.target.value })}
            className={`${inputClass} mt-1`}
          >
            {BUSINESS_SEGMENTS.map((s) => (
              <option key={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Interested in
          <select
            value={lead.interest}
            onChange={(e) => onLeadChange({ interest: e.target.value })}
            className={`${inputClass} mt-1`}
          >
            {BUSINESS_INTERESTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 sm:col-span-2">
          Roughly how many vehicles or users?
          <select
            value={lead.size}
            onChange={(e) => onLeadChange({ size: e.target.value })}
            className={`${inputClass} mt-1`}
          >
            {BUSINESS_SIZES.map((s) => (
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
        className="inline-flex items-center justify-center rounded-full bg-[#23206b] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-125 active:scale-95"
      >
        Send enquiry
      </button>
      <p className="text-xs text-slate-600">
        Opens your email app addressed to{" "}
        <a href={`mailto:${BUSINESS_EMAIL}`} className="underline">
          {BUSINESS_EMAIL}
        </a>
        . Prefer to write directly? That works too.
      </p>
    </form>
  )
}
