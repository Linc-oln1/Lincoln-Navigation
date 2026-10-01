// The /admin/billing dashboard, styled as a dark glass dashboard (owner's
// reference: icon rail, hero card with a frosted stats strip, chart card,
// big-number card, glass rows). Takes the report; the page does auth + data.

import Image from "next/image"
import Link from "next/link"
import localFont from "next/font/local"
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Crown,
  Mail,
  Map as MapIcon,
  Sparkles,
  Store,
  User,
  Users,
  Wallet,
} from "lucide-react"
import type { BillingReport, Subscriber } from "@/lib/billing-report"
import { PREMIUM_PRICE_PESEWAS, PRO_PRICE_PESEWAS } from "@/lib/monetization"
import { BillingChart, type DayTotal } from "@/components/admin/billing-chart"
import { PaymentsList } from "@/components/admin/payments-list"
import { cn } from "@/lib/utils"

// Self-hosted (app/fonts, SIL OFL — see Unbounded-OFL.txt): fetching it from
// Google Fonts at build time made Vercel builds fail.
const display = localFont({
  src: [
    { path: "../../app/fonts/unbounded-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../app/fonts/unbounded-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
})


const DAY_MS = 86_400_000

const ghs = (pesewas: number, decimals = 0) =>
  `GHS ${(pesewas / 100).toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }) : "—"

const STATUS: Record<string, { label: string; warn?: boolean; good?: boolean }> = {
  active: { label: "Renewing", good: true },
  attention: { label: "Payment failed", warn: true },
  "non-renewing": { label: "Cancelling" },
  cancelled: { label: "Cancelled" },
  completed: { label: "Ended" },
}

const glass = "rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-xl"

export function BillingDashboard({ report: r, adminEmail }: { report: BillingReport; adminEmail: string | null }) {
  const collected = r.collectedThisMonth
  const collectedTotal = collected ? collected.plans + collected.listings + collected.other : null
  const month = new Date().toLocaleDateString("en-GB", { month: "long", timeZone: "Africa/Accra" })

  // Last 31 days, one point per Accra day (Accra is UTC).
  const today = new Date()
  const days: DayTotal[] = Array.from({ length: 31 }, (_, i) => ({
    day: new Date(today.getTime() - (30 - i) * DAY_MS).toISOString().slice(0, 10),
    plans: 0,
    listings: 0,
  }))
  const byDay = new Map(days.map((d) => [d.day, d]))
  for (const p of r.payments ?? []) {
    const d = byDay.get(p.paidAt.slice(0, 10))
    if (!d || p.currency !== "GHS") continue
    if (p.kind === "Sponsored listing" || p.kind === "Listing renewal") d.listings += p.amountPesewas
    else if (p.kind !== "Other") d.plans += p.amountPesewas
  }

  const stats = [
    { icon: Users, label: "Paying", value: String(r.renewingPremium + r.renewingPro) },
    { icon: Sparkles, label: "Premium", value: String(r.renewingPremium) },
    { icon: Crown, label: "Pro", value: String(r.renewingPro) },
    { icon: Wallet, label: `${month} collected`, value: collectedTotal === null ? "—" : (collectedTotal / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 }), unit: "GHS" },
  ] as { icon: typeof Users; label: string; value: string; unit?: string }[]

  return (
    <main className="min-h-screen bg-[#141110] p-3 text-white sm:p-6 lg:p-10">
      {/* the dashboard panel, with a warm glow behind it */}
      <div className="relative mx-auto flex max-w-7xl gap-5 overflow-hidden rounded-[36px] bg-[radial-gradient(ellipse_at_35%_25%,#7a4a2c_0%,#3d2c25_38%,#262120_70%)] p-3 shadow-2xl sm:p-5">
        {/* icon rail */}
        <nav aria-label="Admin" className="hidden w-[68px] flex-shrink-0 flex-col items-center justify-between rounded-[28px] bg-[#111] py-5 md:flex">
          <div className="flex flex-col items-center gap-3">
            <Link href="/" aria-label="Lincoln Navigation home" className="mb-4 overflow-hidden rounded-xl">
              <Image src="/pwa/icon-192.png" alt="" width={40} height={40} className="h-10 w-10" />
            </Link>
            <RailLink href="/admin/billing" label="Billing" active><BarChart3 className="h-5 w-5" /></RailLink>
            <RailLink href="/admin/sponsors" label="Sponsored places"><Store className="h-5 w-5" /></RailLink>
            <RailLink href="/app" label="Open the map"><MapIcon className="h-5 w-5" /></RailLink>
          </div>
          <RailLink href="/account" label="My account"><User className="h-5 w-5" /></RailLink>
        </nav>

        <div className="min-w-0 flex-1">
          {/* header */}
          <header className="flex flex-wrap items-center justify-between gap-4 px-2 pt-2 sm:px-4 sm:pt-4">
            <h1 className={cn(display.className, "text-3xl font-medium tracking-tight sm:text-[40px]")}>Billing</h1>
            <div className="flex items-center gap-2">
              <Link href="/admin/sponsors" className="rounded-full p-2.5 hover:bg-white/10 md:hidden" aria-label="Sponsored places">
                <Store className="h-5 w-5" />
              </Link>
              <a
                href="https://dashboard.paystack.com/#/transactions"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full p-2.5 hover:bg-white/10"
                aria-label="Open Paystack transactions"
                title="Open Paystack"
              >
                <ArrowUpRight className="h-5 w-5" />
              </a>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-sm font-semibold" title={adminEmail ?? ""}>
                {(adminEmail ?? "A").charAt(0).toUpperCase()}
              </span>
            </div>
          </header>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            {/* hero */}
            <section className={cn(glass, "relative overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(232,120,52,0.18))] sm:min-h-[420px] lg:row-span-2")}>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] sm:w-1/2">
                <Image
                  src="/landing/photos/kakum.webp"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, 50vw"
                  className="object-cover object-center opacity-80 saturate-[0.8] [mask-image:linear-gradient(to_right,transparent,black_45%)]"
                  priority
                />
                {/* tint it into the warm glow so it reads as part of the card */}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(122,74,44,0.35),rgba(38,33,32,0.15)_45%,rgba(38,33,32,0.55))] mix-blend-multiply" aria-hidden />
                <div className="absolute inset-0 rounded-full border border-white/10 [transform:scale(1.4)]" aria-hidden />
              </div>
              <div className="relative max-w-[64%] p-6 sm:max-w-[60%] sm:p-8">
                <p className="text-xs text-white/75">Lincoln Navigation</p>
                <h2 className={cn(display.className, "mt-4 text-[26px] font-medium leading-[1.15] sm:text-[44px]")}>
                  Every cedi,
                  <br />
                  one place
                </h2>
                <a
                  href="https://dashboard.paystack.com/#/transactions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 sm:px-8 text-sm font-semibold text-[#141110] shadow-lg transition hover:bg-white/90"
                >
                  Open Paystack
                </a>
              </div>

              {/* frosted stats strip */}
              {/* below the text on phones; floating over the photo from sm up */}
              <div className="relative m-3 grid grid-cols-2 gap-y-4 rounded-[24px] border border-white/10 bg-white/10 px-4 py-5 backdrop-blur-xl sm:absolute sm:inset-x-4 sm:bottom-4 sm:m-0 sm:grid-cols-4 sm:px-6">
                {stats.map(({ icon: Icon, label, value, unit }) => (
                  <div key={label} className="min-w-0 px-2">
                    <p className={cn(display.className, "truncate text-2xl font-medium sm:text-[28px]")}>
                      {unit && <span className="mr-1 align-top text-xs font-medium text-white/70">{unit}</span>}
                      {value}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/80">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {label}
                    </p>
                    <span className="mt-2 block h-px w-16 bg-white/40" aria-hidden />
                  </div>
                ))}
              </div>
            </section>

            {/* chart */}
            <section className={cn(glass, "bg-[#26201d]/80 p-5")}>
              <h2 className="mb-3 text-sm font-medium text-white/90">Collected per day, last 31 days</h2>
              <BillingChart days={days} />
            </section>

            {/* monthly recurring */}
            <section className={cn(glass, "grid grid-cols-[minmax(0,1fr)_auto] gap-4 p-5")}>
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-white/90">Monthly recurring</h2>
                <p className={cn(display.className, "mt-5 text-3xl font-medium text-[#d6f5a8] sm:text-4xl")}>
                  {ghs(r.monthlyRecurringPesewas)}
                </p>
                <p className="mt-4 text-xs leading-relaxed text-white/65">
                  {r.renewingPremium} × Premium GHS {PREMIUM_PRICE_PESEWAS / 100}
                  <br />
                  {r.renewingPro} × Pro GHS {PRO_PRICE_PESEWAS / 100}
                  <br />
                  at today&rsquo;s prices
                </p>
              </div>
              <div className="flex w-32 flex-col items-center justify-end rounded-[22px] bg-white/10 p-3 sm:w-40">
                <Image src="/logo/lincoln-navigation-mark.webp" alt="" width={300} height={169} className="w-full rounded-xl shadow-lg" />
                <p className="mt-3 text-center text-[11px] text-white/80">Premium &amp; Pro</p>
              </div>
            </section>
          </div>

          {r.paystackError && <p className={cn(glass, "mt-4 px-5 py-3 text-sm text-white/80")}>{r.paystackError}</p>}

          {/* failed renewals */}
          {r.failed.length > 0 && (
            <section className={cn(glass, "mt-4 border-amber-400/40 p-5")}>
              <h2 className="flex items-center gap-2 text-base font-medium">
                <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden />
                {r.failed.length} failed renewal{r.failed.length === 1 ? "" : "s"}
              </h2>
              <p className="mt-1 text-xs text-white/65">
                Card declined. We&rsquo;ve emailed them; Paystack won&rsquo;t retry until the next payment date.
              </p>
              <ul className="mt-3 space-y-2">
                {r.failed.map((s) => (
                  <li key={s.subscription_code} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/[0.07] px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{s.email}</span>
                      <span className="text-white/60"> · {planName(s)}{s.card_last4 ? ` · card ${s.card_last4}` : ""} · ends {fmtDate(s.paidUntil)}</span>
                    </span>
                    <a
                      href={`mailto:${s.email}?subject=${encodeURIComponent("Your Lincoln Navigation renewal")}&body=${encodeURIComponent(
                        `Hi,\n\nYour last ${planName(s)} renewal didn't go through. You can update your card on your account page: https://www.lincolnnavigation.com/account (Plan → Update card).\n\nThanks,\nThe LincolnNavigation Team`,
                      )}`}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3 py-1.5 text-xs font-semibold text-[#141110] hover:bg-white/90"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden /> Email them
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* payments */}
          <section className={cn(glass, "mt-4 p-4 sm:p-6")}>
            {r.payments ? (
              <PaymentsList payments={r.payments} />
            ) : (
              <p className="text-sm text-white/70">{r.paystackError ?? "Payments unavailable."}</p>
            )}
          </section>

          {/* subscribers */}
          <section className={cn(glass, "mt-4 p-4 sm:p-6")}>
            <h2 className="text-base font-medium sm:text-lg">Subscribers</h2>
            <p className="mt-1 text-xs text-white/60">
              Every Premium and Pro subscription, newest first.
              {r.cancelling.length > 0 && ` ${r.cancelling.length} cancelled but still inside a paid month.`}
            </p>
            {r.subscribers.length === 0 ? (
              <p className="mt-4 rounded-3xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/60">
                No subscriptions yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {r.subscribers.map((s) => {
                  const st = STATUS[s.status] ?? { label: s.status }
                  return (
                    <li
                      key={s.subscription_code}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-white/[0.07] p-2 pr-4 md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:gap-4"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                        {s.plan === "pro" ? <Crown className="h-5 w-5" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.email}</p>
                        <p className="mt-0.5 text-xs text-white/55">{planName(s)} · since {fmtDate(s.created_at)}</p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex w-fit items-center gap-1 justify-self-end rounded-full px-2.5 py-1 text-[11px] font-semibold md:justify-self-start",
                          st.good && "bg-emerald-400/15 text-emerald-300",
                          st.warn && "bg-amber-400/15 text-amber-300",
                          !st.good && !st.warn && "bg-white/10 text-white/70",
                        )}
                      >
                        {st.warn && <AlertTriangle className="h-3 w-3" aria-hidden />}
                        {st.label}
                      </span>
                      <p className="hidden text-xs tabular-nums text-white/75 md:block">
                        {s.status === "active" ? `Charges ${fmtDate(s.next_payment_at)}` : `Ends ${fmtDate(s.paidUntil)}`}
                      </p>
                      <p className="hidden text-xs text-white/60 md:block">
                        {s.card_last4 ? `${cap(s.card_brand ?? "card")} ·${s.card_last4}` : "—"}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <p className="mt-6 px-2 text-xs text-white/45">Times are Accra time. Monthly recurring uses today&rsquo;s prices; payments come straight from Paystack.</p>
        </div>
      </div>
    </main>
  )
}

function RailLink({ href, label, active, children }: { href: string; label: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white",
        active && "border border-white/15 bg-white/10 text-white",
      )}
    >
      {children}
    </Link>
  )
}

function planName(s: Subscriber) {
  return s.plan === "pro" ? "Pro" : "Premium"
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
