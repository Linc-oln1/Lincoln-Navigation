"use client"

import { Suspense, useCallback, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Briefcase, Check, Loader2, Map as MapIcon, Sparkles } from "lucide-react"
import {
  FREE_FEATURES,
  PREMIUM_CURRENCY,
  PREMIUM_ENABLED,
  PREMIUM_FEATURES,
  PREMIUM_PRICE_PESEWAS,
  PRO_FEATURES,
  PRO_PRICE_PESEWAS,
  type PlanFeature,
} from "@/lib/monetization"
import { usePremium } from "@/hooks/use-premium"
import { useLocalCurrency } from "@/hooks/use-local-currency"
import { BASE_CURRENCY, PICKER_CURRENCIES, RATES_CREDIT_URL, currencyName, formatConverted } from "@/lib/currency"
import { AgreeLine } from "@/components/site-links"
import { cn } from "@/lib/utils"

type PlanId = "free" | "premium" | "pro"

interface Plan {
  id: PlanId
  name: string
  badge: string
  icon: typeof Sparkles
  pesewas: number
  /** Small line under the price. */
  terms: string
  /** Lead-in above the included list, for the paid tiers. */
  lead?: string
  included: PlanFeature[]
  /** What the next tier up adds — shown struck through, as "not in this plan". */
  upsell?: { tier: string; features: PlanFeature[] }
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    badge: "Free forever",
    icon: MapIcon,
    pesewas: 0,
    terms: "forever · no sign-up needed",
    included: FREE_FEATURES,
    upsell: { tier: "Premium", features: PREMIUM_FEATURES },
  },
  {
    id: "premium",
    name: "Premium",
    badge: "Recommended",
    icon: Sparkles,
    pesewas: PREMIUM_PRICE_PESEWAS,
    terms: "per month · paid 31 days at a time",
    lead: "Everything in Free, plus",
    included: PREMIUM_FEATURES,
    upsell: { tier: "Pro", features: PRO_FEATURES },
  },
  {
    id: "pro",
    name: "Pro",
    badge: "For businesses",
    icon: Briefcase,
    pesewas: PRO_PRICE_PESEWAS,
    terms: "per month · paid 31 days at a time",
    lead: "Everything in Premium, plus",
    included: PRO_FEATURES,
  },
]

/** Struck-through upsell lines shown before collapsing to "+N more". */
const UPSELL_PREVIEW = 3

/**
 * The four callouts around the card. `target` is the part of the card
 * each one points at; copy is per plan so every line stays true.
 */
type CalloutTarget = "price" | "terms" | "cta" | "features"
const CALLOUTS: Record<PlanId, { target: CalloutTarget; side: "left" | "right"; title: string; body: string }[]> = {
  free: [
    { target: "price", side: "left", title: "Actually free", body: "No card, no trial that runs out." },
    { target: "terms", side: "right", title: "Nothing to sign", body: "Open the map and go — an account is optional." },
    { target: "cta", side: "left", title: "One step", body: "The map opens right in your browser." },
    { target: "features", side: "right", title: "What upgrading adds", body: "Crossed-out lines are the extras in Premium." },
  ],
  premium: [
    { target: "price", side: "left", title: "Transparent pricing", body: "In cedis, taxes included. What you see is what you pay." },
    { target: "terms", side: "right", title: "No auto-renewal", body: "Pays for 31 days. Nothing charges again unless you buy again." },
    { target: "cta", side: "left", title: "Clear next step", body: "Your email, then secure checkout with Paystack." },
    { target: "features", side: "right", title: "All live today", body: "Every feature listed works now — nothing is “coming soon”." },
  ],
  pro: [
    { target: "price", side: "left", title: "Transparent pricing", body: "In cedis, taxes included. What you see is what you pay." },
    { target: "terms", side: "right", title: "No auto-renewal", body: "Pays for 31 days. Nothing charges again unless you buy again." },
    { target: "cta", side: "left", title: "Bigger team?", body: "Talk to us about a team plan below the button." },
    { target: "features", side: "right", title: "All live today", body: "Fleet, truck routing, runs and analytics work now." },
  ],
}

/** What Paystack actually charges, e.g. "GHS 90.00". */
function ghsLabel(pesewas: number): string {
  return `${PREMIUM_CURRENCY} ${(pesewas / 100).toFixed(2)}`
}

/** The visitor's display currency, passed down to the card and callouts. */
interface Money {
  currency: string
  rate: number
  /** Showing a non-GHS estimate (rates loaded and a foreign currency chosen). */
  converted: boolean
}

function splitPrice(pesewas: number): { whole: string; cents: string } {
  const whole = Math.floor(pesewas / 100).toLocaleString()
  const cents = pesewas % 100
  return { whole, cents: cents ? `.${String(cents).padStart(2, "0")}` : "" }
}

export default function PricingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#07060b]" />}>
      <PricingContent />
    </Suspense>
  )
}

function PricingContent() {
  const params = useSearchParams()
  const { isPremium, isPro, expiresAt } = usePremium()
  // ?plan=free|pro picks the tab; coming back from a Pro payment opens Pro.
  const [planId, setPlanId] = useState<PlanId>(() => {
    const p = params.get("plan")
    if (p === "free" || p === "pro") return p
    return params.get("welcome") === "pro" ? "pro" : "premium"
  })
  const [emails, setEmails] = useState<Record<"premium" | "pro", string>>({ premium: "", pro: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const welcomeParam = params.get("welcome")
  const welcome = welcomeParam === "1"
  const welcomePro = welcomeParam === "pro"
  const paymentError = params.get("error")
  const plan = PLANS.find((p) => p.id === planId)!
  const cur = useLocalCurrency()
  const money: Money = { currency: cur.currency, rate: cur.rate, converted: cur.ready && cur.isConverted }
  // The price callout must stay true when the card shows an estimate.
  const callouts = CALLOUTS[plan.id].map((c) =>
    c.target === "price" && money.converted && plan.pesewas > 0
      ? {
          ...c,
          title: `Shown in ${money.currency}`,
          body: `An estimate at today's rate. You're charged ${ghsLabel(plan.pesewas)}; your bank's rate may differ a little.`,
        }
      : c,
  )

  const choosePlan = (id: PlanId) => {
    setPlanId(id)
    setError(null)
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault()
    if (plan.id === "free") return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emails[plan.id], plan: plan.id }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout.")
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#07060b] text-white">
      <PricingBackdrop />
      <div className="relative z-10">
        <SiteHeader variant="violet" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c4b5fd]">Pricing</p>
          <h1 className="mt-4 text-4xl leading-tight tracking-tight sm:text-6xl">
            <span className="font-extrabold">Every road.</span>{" "}
            <span className="block font-light text-white/90 sm:inline">One simple price.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/60 sm:text-lg">
            The map, search and directions are free forever. Pay only for the extras you want — 31
            days at a time.
          </p>
        </header>

        <div className="mx-auto mt-8 max-w-xl space-y-3">
          {welcome && <Notice tone="good">🎉 You&rsquo;re on Premium. Thank you for supporting the project!</Notice>}
          {welcomePro && <Notice tone="good">🎉 You&rsquo;re on Pro. Thank you — it includes everything in Premium.</Notice>}
          {paymentError && (
            <Notice tone="bad">
              {paymentError === "payment-expired" ? (
                <>That payment is more than 31 days old, so the plan it bought has already run out. Buy again below to renew.</>
              ) : paymentError === "payment-not-a-plan" ? (
                <>
                  That payment wasn&rsquo;t for a Premium or Pro plan, so nothing was unlocked. If you were charged for a
                  plan, email info@lincolnnavigation.com with your payment reference.
                </>
              ) : (
                <>
                  We couldn&rsquo;t confirm that payment ({paymentError}). If you were charged, wait a minute and open the
                  link from your payment email again, or contact info@lincolnnavigation.com.
                </>
              )}
            </Notice>
          )}
          {isPremium && !welcome && !welcomePro && (
            <Notice tone="good">
              Your {isPro ? "Pro" : "Premium"} plan is active
              {expiresAt ? ` until ${new Date(expiresAt).toLocaleDateString()}` : ""}.
            </Notice>
          )}
        </div>

        {/* ---- plan switcher ---- */}
        <div role="tablist" aria-label="Plans" className="mx-auto mt-10 flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === planId}
              aria-controls="plan-card"
              onClick={() => choosePlan(p.id)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors sm:px-7",
                p.id === planId ? "bg-white text-[#12091f]" : "text-white/60 hover:text-white",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        {cur.ready && cur.availableRates && (
          <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-white/50">
            <label htmlFor="price-currency">Prices in</label>
            <select
              id="price-currency"
              value={cur.currency}
              onChange={(e) => cur.setCurrency(e.target.value)}
              className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white outline-none focus:border-[#a78bfa]"
            >
              {Array.from(new Set([cur.currency, ...PICKER_CURRENCIES]))
                .filter((c) => c === BASE_CURRENCY || cur.availableRates?.[c])
                .map((c) => (
                  <option key={c} value={c} className="bg-[#14101f]">
                    {c} — {currencyName(c)}
                  </option>
                ))}
            </select>
            {money.converted && (
              <span className="basis-full text-center sm:basis-auto">
                Estimate — you pay in cedis ·{" "}
                <a href={RATES_CREDIT_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/80">
                  Rates By Exchange Rate API
                </a>
              </span>
            )}
          </div>
        )}

        <PlanStage plan={plan} callouts={callouts}>
          {(refs) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              refs={refs}
              active={plan.id === "free" ? false : plan.id === "pro" ? isPro : isPremium}
              activeLabel={plan.id === "premium" && isPro ? "Included in your Pro plan" : "Active — you’re all set"}
              email={plan.id === "free" ? "" : emails[plan.id]}
              onEmail={(v) => plan.id !== "free" && setEmails((m) => ({ ...m, [plan.id]: v }))}
              busy={busy}
              error={error}
              onSubmit={checkout}
              money={money}
            />
          )}
        </PlanStage>

        <p className="mt-14 text-center text-sm text-white/55">
          Run a business in Ghana?{" "}
          <Link href="/advertise" className="font-semibold text-[#c4b5fd] hover:underline">
            Advertise or sponsor a place →
          </Link>
        </p>
      </div>

      <div className="relative z-10">
        <SiteFooter variant="violet" />
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */

function Notice({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm backdrop-blur",
        tone === "good" ? "border-[#8b5cf6]/40 bg-[#8b5cf6]/10 text-white/90" : "border-red-400/40 bg-red-500/10 text-red-100",
      )}
    >
      {children}
    </div>
  )
}

/** Near-black with faint scanlines, soft blurred "UI" shapes and a violet glow — no imagery. */
function PricingBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_4px)]" />
      <div className="absolute left-1/2 top-[420px] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[#7c3aed]/20 blur-[120px]" />
      {[
        "left-[6%] top-[520px] h-40 w-56",
        "left-[14%] top-[820px] h-24 w-72",
        "right-[8%] top-[480px] h-28 w-60",
        "right-[12%] top-[900px] h-44 w-52",
        "left-[38%] top-[300px] h-16 w-80",
      ].map((c) => (
        <div key={c} className={cn("absolute rounded-2xl border border-white/[0.04] bg-white/[0.025] blur-[2px]", c)} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface CardRefs {
  price: React.RefObject<HTMLDivElement | null>
  terms: React.RefObject<HTMLParagraphElement | null>
  cta: React.RefObject<HTMLDivElement | null>
  features: React.RefObject<HTMLUListElement | null>
}

/**
 * Lays the card out with its four callouts. On wide screens each callout
 * sits beside the card at the height of the thing it describes (measured,
 * since the card's content changes per plan) with a connector line; on
 * narrower screens they drop into a grid under the card.
 */
function PlanStage({
  plan,
  callouts,
  children,
}: {
  plan: Plan
  callouts: (typeof CALLOUTS)[PlanId]
  children: (refs: CardRefs) => React.ReactNode
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const refs: CardRefs = {
    price: useRef<HTMLDivElement>(null),
    terms: useRef<HTMLParagraphElement>(null),
    cta: useRef<HTMLDivElement>(null),
    features: useRef<HTMLUListElement>(null),
  }
  const [ys, setYs] = useState<Partial<Record<CalloutTarget, number>>>({})

  const measure = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const top = stage.getBoundingClientRect().top
    const mid = (el: Element | null) => {
      if (!el) return undefined
      const r = el.getBoundingClientRect()
      return r.top - top + Math.min(r.height, 120) / 2
    }
    setYs({
      price: mid(refs.price.current),
      terms: mid(refs.terms.current),
      cta: mid(refs.cta.current),
      features: mid(refs.features.current),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (cardRef.current) ro.observe(cardRef.current)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure, plan.id])

  return (
    <div className="mt-8">
      <div ref={stageRef} className="relative mx-auto grid max-w-[1100px] items-start xl:grid-cols-[1fr_440px_1fr]">
        {(["left", "right"] as const).map((side) => (
          <div key={side} className={cn("relative hidden h-full xl:block", side === "left" ? "xl:order-1" : "xl:order-3")}>
            {callouts
              .filter((c) => c.side === side)
              .map((c) => {
                const y = ys[c.target]
                if (y === undefined) return null
                return (
                  <div
                    key={c.title}
                    className="absolute inset-x-0 -translate-y-1/2 transition-[top] duration-300"
                    style={{ top: y }}
                  >
                    <div className={cn("flex items-center", side === "left" ? "flex-row" : "flex-row-reverse")}>
                      <Callout title={c.title} body={c.body} className="w-[220px] flex-shrink-0" />
                      {/* connector: dot at the callout, diamond at the card */}
                      <span className="relative mx-0 h-px flex-1 bg-gradient-to-r from-[#a78bfa] to-[#a78bfa]">
                        <span className={cn("absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#a78bfa]", side === "left" ? "-left-1" : "-right-1")} />
                        <span className={cn("absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-[#c4b5fd]", side === "left" ? "-right-1" : "-left-1")} />
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        ))}

        <div ref={cardRef} id="plan-card" role="tabpanel" className="mx-auto w-full max-w-[440px] xl:order-2">
          {children(refs)}
        </div>
      </div>

      {/* narrow screens: the same callouts as a grid */}
      <div className="mx-auto mt-8 grid max-w-[440px] gap-3 sm:max-w-2xl sm:grid-cols-2 xl:hidden">
        {callouts.map((c) => (
          <Callout key={c.title} title={c.title} body={c.body} />
        ))}
      </div>
    </div>
  )
}

function Callout({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md", className)}>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/50">{body}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PlanCard({
  plan,
  refs,
  active,
  activeLabel,
  email,
  onEmail,
  busy,
  error,
  onSubmit,
  money,
}: {
  plan: Plan
  refs: CardRefs
  active: boolean
  activeLabel: string
  email: string
  onEmail: (v: string) => void
  busy: boolean
  error: string | null
  onSubmit: (e: React.FormEvent) => void
  money: Money
}) {
  const { whole, cents } = splitPrice(plan.pesewas)
  const local = money.converted ? formatConverted((plan.pesewas / 100) * money.rate, money.currency) : null
  const Icon = plan.icon
  const [showAllUpsell, setShowAllUpsell] = useState(false)
  const upsell = plan.upsell
  const upsellShown = upsell ? (showAllUpsell ? upsell.features : upsell.features.slice(0, UPSELL_PREVIEW)) : []
  const hidden = upsell ? upsell.features.length - upsellShown.length : 0

  return (
    // 1px gradient "border": violet at the top fading out down the sides.
    <div className="rounded-[30px] bg-gradient-to-b from-[#a78bfa] via-[#6d28d9]/40 to-white/10 p-px shadow-[0_0_80px_-10px_rgba(139,92,246,0.55)]">
      <div className="relative overflow-hidden rounded-[29px] bg-[linear-gradient(160deg,#261a3d_0%,#140e22_45%,#0d0a15_100%)] px-6 pb-10 pt-7 sm:px-8">
        {/* glow rising from the bottom edge */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_bottom,rgba(192,132,252,0.75),rgba(139,92,246,0.25)_45%,transparent_72%)]" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-2xl font-medium">{plan.name}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-white/85">
              <Icon className="h-3.5 w-3.5 text-[#c4b5fd]" />
              {plan.badge}
            </span>
          </div>

          <div ref={refs.price} className="mt-6 flex items-baseline gap-1.5">
            {local ? (
              <>
                {plan.pesewas > 0 && (
                  <span className="text-2xl font-semibold text-white/55" title="Estimate">
                    ≈
                  </span>
                )}
                <span className="text-lg font-semibold text-white/70">{local.symbol}</span>
                <span className="text-6xl font-bold tracking-tight">{local.number}</span>
              </>
            ) : (
              <>
                <span className="text-lg font-semibold text-white/70">{PREMIUM_CURRENCY}</span>
                <span className="text-6xl font-bold tracking-tight">{whole}</span>
                {cents && <span className="text-2xl font-bold text-white/80">{cents}</span>}
              </>
            )}
          </div>
          <p ref={refs.terms} className="mt-2 text-sm font-medium text-white/75">
            {plan.terms}
          </p>
          {local && plan.pesewas > 0 && (
            <p className="mt-1 text-xs text-white/50">
              Charged as <span className="font-semibold text-white/75">{ghsLabel(plan.pesewas)}</span> · your bank
              converts it
            </p>
          )}

          <div ref={refs.cta} className="mt-6">
            {plan.id === "free" ? (
              <Link
                href="/app"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#12091f] shadow-[0_0_0_3px_rgba(139,92,246,0.55)] transition hover:bg-white/90"
              >
                Open the map <ArrowRight className="h-4 w-4" />
              </Link>
            ) : active ? (
              <p className="rounded-full border border-[#a78bfa]/50 bg-[#8b5cf6]/15 px-5 py-3.5 text-center text-sm font-semibold text-[#ddd6fe]">
                {activeLabel}
              </p>
            ) : PREMIUM_ENABLED ? (
              <form onSubmit={onSubmit} className="space-y-3">
                <label htmlFor="plan-email" className="sr-only">
                  Email for your receipt
                </label>
                <input
                  id="plan-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => onEmail(e.target.value)}
                  placeholder={plan.id === "pro" ? "you@company.com" : "you@example.com"}
                  className="w-full rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#a78bfa]"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#12091f] shadow-[0_0_0_3px_rgba(139,92,246,0.55)] transition hover:bg-white/90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? "Starting checkout…" : `Get ${plan.name}`}
                </button>
                {error && <p className="text-center text-xs text-red-300">{error}</p>}
                <p className="text-center text-[11px] text-white/45">
                  Secure payment via Paystack · no auto-renewal
                </p>
                <AgreeLine className="text-center text-white/40" purchase />
              </form>
            ) : (
              <p className="rounded-full border border-dashed border-white/20 px-5 py-3 text-center text-xs text-white/55">
                Checkout isn&rsquo;t live yet — add your Paystack keys to enable it (see docs/MONETIZATION.md).
              </p>
            )}
            {plan.id === "pro" && (
              <Link
                href="/business#talk-to-us"
                className="mt-3 block text-center text-xs font-semibold text-[#c4b5fd] hover:underline"
              >
                Talk to us about a team plan →
              </Link>
            )}
          </div>

          <ul ref={refs.features} className="mt-7 space-y-2.5 text-sm">
            {plan.lead && (
              <li className="pb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/45">{plan.lead}</li>
            )}
            {plan.included.map((f) => (
              <li key={f.text} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#a78bfa]" aria-hidden />
                <span className="text-white/90">{f.text}</span>
              </li>
            ))}
            {upsell && (
              <>
                <li className="pt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">
                  Not included — in {upsell.tier}
                </li>
                {upsellShown.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5 text-white/35">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                    <span className="line-through decoration-white/30">{f.text}</span>
                  </li>
                ))}
                {hidden > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setShowAllUpsell(true)}
                      className="text-xs font-semibold text-[#c4b5fd] hover:underline"
                    >
                      + {hidden} more in {upsell.tier}
                    </button>
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
