"use client"

import { useState } from "react"

const TO = "info@lincolnnavigation.com"

const fieldClass =
  "peer w-full border-0 border-b border-neutral-400 bg-transparent pb-2 pt-6 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900"
const labelClass =
  "pointer-events-none absolute left-0 top-6 origin-left text-xs text-neutral-700 transition-all duration-150 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-neutral-500 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-neutral-500"

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" })
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const mailto = `mailto:${TO}?subject=${encodeURIComponent(
    `Message from ${form.name || "a LincolnNavigation user"}`,
  )}&body=${encodeURIComponent(
    `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone || "-"}\n\n${form.message}`,
  )}`

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault()
        window.location.href = mailto
      }}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-800">
        Feedback form
      </p>

      <div className="mt-6 space-y-1">
        <div className="relative">
          <input id="c-name" required value={form.name} onChange={set("name")} placeholder=" " className={fieldClass} />
          <label htmlFor="c-name" className={labelClass}>Name</label>
        </div>
        <div className="relative">
          <input id="c-email" type="email" required value={form.email} onChange={set("email")} placeholder=" " className={fieldClass} />
          <label htmlFor="c-email" className={labelClass}>E-mail</label>
        </div>
        <div className="relative">
          <input id="c-phone" type="tel" value={form.phone} onChange={set("phone")} placeholder=" " className={fieldClass} />
          <label htmlFor="c-phone" className={labelClass}>Phone (optional)</label>
        </div>
        <div className="relative">
          <textarea id="c-msg" required rows={2} value={form.message} onChange={set("message")} placeholder=" " className={`${fieldClass} resize-none`} />
          <label htmlFor="c-msg" className={labelClass}>Message</label>
        </div>
      </div>

      <div className="mt-8 flex justify-end md:mr-[-3.5rem]">
        <button
          type="submit"
          className="group flex items-center gap-3 whitespace-nowrap rounded-l-md bg-[#1c1c1c] px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg transition-all duration-150 hover:bg-black active:scale-[0.98] md:rounded-r-none"
        >
          Send message
          <span className="h-px w-4 bg-white transition-all duration-150 group-hover:w-6" />
        </button>
      </div>
      <p className="mt-3 text-[10px] leading-snug text-neutral-500">
        Opens your email app with the message ready to send.
      </p>
    </form>
  )
}
