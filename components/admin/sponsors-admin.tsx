"use client"

// /admin/sponsors — the list of sponsors grouped by what needs doing,
// with actions (approve, extend, pause, end…), inline edits, stats, and
// a form to add a sponsor who paid outside the website.

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatSponsorPrice, SPONSOR_DAYS, SPONSOR_PACKAGES } from "@/lib/monetization"
import { SPONSOR_CATEGORIES, sponsorCategoryLabel } from "@/lib/sponsored-places"
import type { SponsorRow, SponsorStats } from "@/lib/sponsor-store"
import { LocationPicker, type PickedLocation } from "@/components/sponsor/location-picker"

type Sponsor = SponsorRow & { total: SponsorStats; last30: SponsorStats }

const input =
  "w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"

const GROUPS: { title: string; statuses: SponsorRow["status"][]; empty: string }[] = [
  { title: "Waiting for approval", statuses: ["pending_review"], empty: "Nothing to approve." },
  { title: "Live", statuses: ["active"], empty: "No live sponsors." },
  { title: "Paused, ended & other", statuses: ["paused", "ended", "rejected", "awaiting_payment"], empty: "None." },
]

const STATUS_LABEL: Record<SponsorRow["status"], string> = {
  awaiting_payment: "Not paid",
  pending_review: "Paid · needs approval",
  active: "Live",
  paused: "Paused",
  ended: "Ended",
  rejected: "Rejected",
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"

export function SponsorsAdmin() {
  const [sponsors, setSponsors] = useState<Sponsor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sponsors", { cache: "no-store" })
    const data = (await res.json().catch(() => null)) as { sponsors?: Sponsor[]; error?: string } | null
    if (!res.ok || !data?.sponsors) setError(data?.error || "Couldn’t load sponsors.")
    else {
      setError(null)
      setSponsors(data.sponsors)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!sponsors) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />

  // A live listing whose end date has passed is effectively over.
  const now = Date.now()
  const isExpired = (s: Sponsor) => s.status === "active" && !!s.ends_at && Date.parse(s.ends_at) <= now

  return (
    <div className="space-y-10">
      <div>
        {adding ? (
          <AddSponsor
            onDone={() => {
              setAdding(false)
              void load()
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            <Plus className="h-4 w-4" /> Add a sponsor paid outside the website
          </button>
        )}
      </div>

      {GROUPS.map((g) => {
        const rows = sponsors.filter((s) =>
          g.statuses.includes(s.status) &&
          (g.statuses.includes("active") ? !isExpired(s) : true),
        ).concat(g.statuses.includes("ended") ? sponsors.filter(isExpired) : [])
        return (
          <section key={g.title}>
            <h2 className="mb-3 text-lg font-semibold">
              {g.title} <span className="text-muted-foreground">({rows.length})</span>
            </h2>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{g.empty}</p>
            ) : (
              <div className="space-y-3">
                {rows.map((s) => (
                  <SponsorCard key={s.id} sponsor={s} expired={isExpired(s)} onChanged={load} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function SponsorCard({
  sponsor: s,
  expired,
  onChanged,
}: {
  sponsor: Sponsor
  expired: boolean
  onChanged: () => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(label)
    setError(null)
    const res = await fetch(`/api/admin/sponsors/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    if (!res.ok) setError(data?.error || "Update failed.")
    else {
      setEditing(false)
      await onChanged()
    }
    setBusy(null)
  }

  const ctr = s.last30.impressions ? ((s.last30.clicks / s.last30.impressions) * 100).toFixed(1) + "%" : "—"
  const actions: { label: string; action: string; primary?: boolean; confirm?: string }[] =
    s.status === "pending_review"
      ? [
          { label: `Approve & start ${SPONSOR_DAYS} days`, action: "approve", primary: true },
          { label: "Reject", action: "reject", confirm: "Reject this paid listing? Remember to refund it in Paystack if you agreed to." },
        ]
      : s.status === "active" && !expired
        ? [
            { label: `Extend ${SPONSOR_DAYS} days`, action: "extend", primary: true },
            { label: "Pause", action: "pause" },
            { label: "End now", action: "end", confirm: "End this listing now?" },
          ]
        : s.status === "paused"
          ? [{ label: "Resume", action: "resume", primary: true }, { label: "End", action: "end" }]
          : s.status === "ended" || expired
            ? [{ label: `Renew ${SPONSOR_DAYS} days`, action: "extend", primary: true }]
            : []

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{s.name}</h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                s.status === "active" && !expired
                  ? "bg-emerald-500/15 text-emerald-600"
                  : s.status === "pending_review"
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {expired ? "Expired" : STATUS_LABEL[s.status]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {sponsorCategoryLabel(s.category)} · {s.package === "custom" ? "Custom" : SPONSOR_PACKAGES.find((p) => p.id === s.package)?.label} ·{" "}
            {s.radius_km} km · {s.address}
          </p>
          {s.tagline && <p className="mt-1 text-sm">&ldquo;{s.tagline}&rdquo;</p>}
          {s.url && (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-sm text-primary hover:underline">
              {s.url}
            </a>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-4 text-right text-sm">
          <Stat label="Views (30d)" value={s.last30.impressions} total={s.total.impressions} />
          <Stat label="Opens (30d)" value={s.last30.clicks} total={s.total.clicks} />
          <Stat label="Website (30d)" value={s.last30.website_clicks} total={s.total.website_clicks} />
        </dl>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {s.contact_name ? `${s.contact_name} · ` : ""}
        <a href={`mailto:${s.contact_email}`} className="hover:underline">{s.contact_email}</a>
        {s.contact_phone ? ` · ${s.contact_phone}` : ""} · Paid{" "}
        {s.paid_at ? `${fmtDate(s.paid_at)}${s.amount_pesewas ? ` (${formatSponsorPrice(s.amount_pesewas)})` : ""}` : "—"} · Runs{" "}
        {fmtDate(s.starts_at)} → {s.ends_at ? fmtDate(s.ends_at) : "no end date"} · Open rate {ctr}
        {s.paystack_reference ? ` · Ref ${s.paystack_reference}` : ""}
      </p>
      {s.notes && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs">{s.notes}</p>}

      {editing ? (
        <EditSponsor
          sponsor={s}
          busy={busy === "save"}
          onCancel={() => setEditing(false)}
          onSave={(fields) => patch(fields, "save")}
        />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.action}
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (a.confirm && !window.confirm(a.confirm)) return
                void patch({ action: a.action }, a.action)
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60",
                a.primary ? "bg-primary text-primary-foreground hover:brightness-110" : "border border-border hover:bg-secondary",
              )}
            >
              {busy === a.action && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary"
          >
            Edit
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </article>
  )
}

function Stat({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value.toLocaleString()}</dd>
      <dd className="text-[11px] text-muted-foreground tabular-nums">{total.toLocaleString()} total</dd>
    </div>
  )
}

function EditSponsor({
  sponsor: s,
  busy,
  onCancel,
  onSave,
}: {
  sponsor: Sponsor
  busy: boolean
  onCancel: () => void
  onSave: (fields: Record<string, unknown>) => void
}) {
  const [f, setF] = useState({
    name: s.name,
    tagline: s.tagline ?? "",
    url: s.url ?? "",
    category: s.category,
    radius_km: String(s.radius_km),
    ends_at: s.ends_at ? s.ends_at.slice(0, 10) : "",
    notes: s.notes ?? "",
  })
  const [location, setLocation] = useState<PickedLocation | null>({ address: s.address, lat: s.lat, lng: s.lng })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }))

  return (
    <form
      className="mt-4 space-y-3 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({
          ...f,
          radius_km: Number(f.radius_km),
          ends_at: f.ends_at ? `${f.ends_at}T23:59:59Z` : "",
          ...(location ?? {}),
        })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Labelled label="Name"><input value={f.name} onChange={set("name")} className={input} /></Labelled>
        <Labelled label="Category">
          <select value={f.category} onChange={set("category")} className={input}>
            {SPONSOR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Labelled>
        <Labelled label="Promo line"><input value={f.tagline} onChange={set("tagline")} maxLength={90} className={input} /></Labelled>
        <Labelled label="Website"><input value={f.url} onChange={set("url")} className={input} placeholder="https://…" /></Labelled>
        <Labelled label="Radius (km)"><input type="number" min={0.5} step={0.5} value={f.radius_km} onChange={set("radius_km")} className={input} /></Labelled>
        <Labelled label="Ends on (blank = no end)"><input type="date" value={f.ends_at} onChange={set("ends_at")} className={input} /></Labelled>
      </div>
      <Labelled label="Location">
        <LocationPicker value={location} onChange={setLocation} inputClassName={input} />
      </Labelled>
      <Labelled label="Notes (only you see these)">
        <textarea value={f.notes} onChange={set("notes")} rows={2} className={input} />
      </Labelled>
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !location} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary">
          Cancel
        </button>
      </div>
    </form>
  )
}

function AddSponsor({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    name: "",
    category: "",
    package: "local",
    radius_km: "5",
    tagline: "",
    url: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    ends_at: "",
    notes: "",
  })
  const [location, setLocation] = useState<PickedLocation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((v) => {
      const next = { ...v, [k]: e.target.value }
      const pkg = SPONSOR_PACKAGES.find((p) => p.id === next.package)
      if (k === "package" && pkg) next.radius_km = String(pkg.radiusKm)
      return next
    })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!location) {
      setError("Pick the business location.")
      return
    }
    setBusy(true)
    setError(null)
    const res = await fetch("/api/admin/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        ...location,
        radius_km: Number(f.radius_km),
        ends_at: f.ends_at ? `${f.ends_at}T23:59:59Z` : "",
      }),
    })
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    setBusy(false)
    if (!res.ok) setError(data?.error || "Couldn’t save.")
    else onDone()
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-semibold">Add a sponsor</h2>
      <p className="text-xs text-muted-foreground">
        For a business that paid by MoMo, bank or cash. It goes live immediately for {SPONSOR_DAYS} days unless you set an end date.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labelled label="Business name"><input required value={f.name} onChange={set("name")} className={input} /></Labelled>
        <Labelled label="Category">
          <select required value={f.category} onChange={set("category")} className={input}>
            <option value="" disabled>Choose…</option>
            {SPONSOR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Labelled>
        <Labelled label="Package">
          <select value={f.package} onChange={set("package")} className={input}>
            {SPONSOR_PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.radiusKm} km)</option>)}
            <option value="custom">Custom</option>
          </select>
        </Labelled>
        <Labelled label="Radius (km)"><input type="number" min={0.5} step={0.5} value={f.radius_km} onChange={set("radius_km")} className={input} /></Labelled>
        <Labelled label="Promo line"><input value={f.tagline} onChange={set("tagline")} maxLength={90} className={input} /></Labelled>
        <Labelled label="Website"><input value={f.url} onChange={set("url")} className={input} placeholder="https://…" /></Labelled>
        <Labelled label="Contact name"><input value={f.contact_name} onChange={set("contact_name")} className={input} /></Labelled>
        <Labelled label="Contact email"><input required type="email" value={f.contact_email} onChange={set("contact_email")} className={input} /></Labelled>
        <Labelled label="Contact phone"><input value={f.contact_phone} onChange={set("contact_phone")} className={input} /></Labelled>
        <Labelled label="Ends on (optional)"><input type="date" value={f.ends_at} onChange={set("ends_at")} className={input} /></Labelled>
      </div>
      <Labelled label="Location">
        <LocationPicker value={location} onChange={setLocation} inputClassName={input} />
      </Labelled>
      <Labelled label="Notes (only you see these)">
        <textarea value={f.notes} onChange={set("notes")} rows={2} className={input} placeholder="e.g. Paid GHS 200 by MoMo on 1 Oct" />
      </Labelled>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add & go live
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary">
          Cancel
        </button>
      </div>
    </form>
  )
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
