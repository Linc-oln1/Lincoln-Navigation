"use client"

// Recent payments on /admin/billing as glass rows, with a filter
// (all / plans / listings) like the reference dashboard's dropdown.

import { useState } from "react"
import { ChevronDown, Crown, RefreshCw, Sparkles, Store, Wallet } from "lucide-react"
import type { Payment, PaymentKind } from "@/lib/billing-report"

const FILTERS = [
  { id: "all", label: "All payments" },
  { id: "plans", label: "Plans" },
  { id: "listings", label: "Listings" },
] as const
type Filter = (typeof FILTERS)[number]["id"]

const isListing = (k: PaymentKind) => k === "Sponsored listing" || k === "Listing renewal"
const isPlan = (k: PaymentKind) => k.startsWith("Premium") || k.startsWith("Pro")

function KindIcon({ kind }: { kind: PaymentKind }) {
  const Icon =
    kind === "Listing renewal" || kind.endsWith("renewal")
      ? RefreshCw
      : kind === "Sponsored listing"
        ? Store
        : kind === "Pro"
          ? Crown
          : kind === "Premium"
            ? Sparkles
            : Wallet
  return (
    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:h-14 sm:w-16">
      <Icon className="h-5 w-5 text-white/85" aria-hidden />
    </span>
  )
}

const CHANNEL: Record<string, string> = { card: "Card", mobile_money: "Mobile money", bank: "Bank", bank_transfer: "Bank transfer", ussd: "USSD" }
const when = (iso: string) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" }) : "—"
const amount = (p: Payment) =>
  `${p.currency} ${(p.amountPesewas / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function PaymentsList({ payments }: { payments: Payment[] }) {
  const [filter, setFilter] = useState<Filter>("all")
  const shown = payments.filter((p) => filter === "all" || (filter === "plans" ? isPlan(p.kind) : isListing(p.kind)))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium text-white sm:text-lg">Payments in the last 31 days</h2>
        <label className="relative">
          <span className="sr-only">Show</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="appearance-none rounded-2xl border border-white/10 bg-white/10 py-3 pl-4 pr-10 text-sm font-medium text-white outline-none backdrop-blur focus:border-white/40"
          >
            {FILTERS.map((f) => (
              <option key={f.id} value={f.id} className="bg-[#2a2320]">
                {f.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" aria-hidden />
        </label>
      </div>

      <div className="mt-4 hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-white/15 px-4 pb-3 text-xs text-white/60 md:grid">
        <span>Payment</span>
        <span>Customer</span>
        <span>Paid with</span>
        <span className="text-right">Amount</span>
      </div>

      {shown.length === 0 ? (
        <p className="mt-4 rounded-3xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/60">
          No {filter === "all" ? "" : filter === "plans" ? "plan " : "listing "}payments in the last 31 days.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((p) => (
            <li
              key={p.reference}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-white/[0.07] p-2 pr-4 backdrop-blur md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4"
            >
              <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                <KindIcon kind={p.kind} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{p.kind}{p.detail ? ` · ${p.detail}` : ""}</p>
                  <p className="mt-0.5 text-xs text-white/55">{when(p.paidAt)}</p>
                  <p className="mt-0.5 truncate text-xs text-white/55 md:hidden">{p.email}</p>
                </div>
              </div>
              <p className="hidden truncate text-sm text-white/80 md:block">{p.email}</p>
              <p className="hidden items-center gap-2 text-xs text-white/75 md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-white/60" aria-hidden />
                {p.channel ? (CHANNEL[p.channel] ?? p.channel) : "—"}
              </p>
              <p className="text-right text-sm font-semibold tabular-nums text-white">{amount(p)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
