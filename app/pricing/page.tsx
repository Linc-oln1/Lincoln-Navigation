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
  FREE_LIMITS,
  type PlanFeature,
} from "@/lib/monetization"
import { usePremium } from "@/hooks/use-premium"
import { useSession } from "@/hooks/use-session"
import { useLocalCurrency } from "@/hooks/use-local-currency"
import { CONTACT_EMAIL } from "@/lib/legal"
import { BASE_CURRENCY, PICKER_CURRENCIES, RATES_CREDIT_URL, currencyName, formatConverted } from "@/lib/currency"
import { useI18n } from "@/components/i18n/language-provider"
import { fillNodes } from "@/components/i18n/rich-text"
import type { MessageKey } from "@/lib/i18n/messages"
import { cn } from "@/lib/utils"

type PlanId = "free" | "premium" | "pro"

interface Plan {
  id: PlanId
  /** "Premium" and "Pro" are product names; "Free" is translated (planName). */
  name: string
  badgeKey: MessageKey
  icon: typeof Sparkles
  pesewas: number
  /** Small line under the price. */
  termsKey: MessageKey
  /** Lead-in above the included list, for the paid tiers. */
  leadKey?: MessageKey
  included: PlanFeature[]
  /** What the next tier up adds — shown struck through, as "not in this plan". */
  upsell?: { tier: string; features: PlanFeature[] }
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    badgeKey: "pr.badge.free",
    icon: MapIcon,
    pesewas: 0,
    termsKey: "pr.terms.free",
    included: FREE_FEATURES,
    upsell: { tier: "Premium", features: PREMIUM_FEATURES },
  },
  {
    id: "premium",
    name: "Premium",
    badgeKey: "pr.badge.premium",
    icon: Sparkles,
    pesewas: PREMIUM_PRICE_PESEWAS,
    termsKey: "pr.terms.paid",
    leadKey: "pr.lead.premium",
    included: PREMIUM_FEATURES,
    upsell: { tier: "Pro", features: PRO_FEATURES },
  },
  {
    id: "pro",
    name: "Pro",
    badgeKey: "pr.badge.pro",
    icon: Briefcase,
    pesewas: PRO_PRICE_PESEWAS,
    termsKey: "pr.terms.paid",
    leadKey: "pr.lead.pro",
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
type Callout = { target: CalloutTarget; side: "left" | "right"; title: string; body: string }
const CALLOUTS: Record<PlanId, { target: CalloutTarget; side: "left" | "right"; key: string }[]> = {
  free: [
    { target: "price", side: "left", key: "actuallyFree" },
    { target: "terms", side: "right", key: "nothingToSign" },
    { target: "cta", side: "left", key: "oneStep" },
    { target: "features", side: "right", key: "upgradeAdds" },
  ],
  premium: [
    { target: "price", side: "left", key: "transparent" },
    { target: "terms", side: "right", key: "choice" },
    { target: "cta", side: "left", key: "nextStep" },
    { target: "features", side: "right", key: "allLive" },
  ],
  pro: [
    { target: "price", side: "left", key: "transparent" },
    { target: "terms", side: "right", key: "choice" },
    { target: "cta", side: "left", key: "team" },
    { target: "features", side: "right", key: "allLivePro" },
  ],
}

type Billing = "monthly" | "once"
const BILLING_OPTIONS: { id: Billing; labelKey: MessageKey; subKey: MessageKey }[] = [
  { id: "monthly", labelKey: "pr.monthly", subKey: "pr.monthlySub" },
  { id: "once", labelKey: "pr.once", subKey: "pr.onceSub" },
]

/** "Free" is translated; "Premium" / "Pro" are product names. */
function planName(plan: Plan, t: (k: MessageKey) => string) {
  return plan.id === "free" ? t("pr.free") : plan.name
}

/** A plan feature line in the visitor's language (English fallback built in). */
function featureText(f: PlanFeature, t: (k: MessageKey, p?: Record<string, string | number>) => string) {
  return t(`pr.f.${f.id}` as MessageKey, { n: FREE_LIMITS.savedPlaces })
}

/** Sign in, then come back to this plan's tab. */
function signInHref(plan: PlanId) {
  return `/login?next=${encodeURIComponent(`/pricing?plan=${plan}`)}`
}

const agreeLink = "underline underline-offset-2 hover:text-white/80"

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
  const { isPremium, isPro, expiresAt, renews } = usePremium()
  const { user, loading: sessionLoading } = useSession()
  const { t, lang } = useI18n()
  // ?plan=free|pro picks the tab; coming back from a Pro payment opens Pro.
  const [planId, setPlanId] = useState<PlanId>(() => {
    const p = params.get("plan")
    if (p === "free" || p === "pro") return p
    return params.get("welcome") === "pro" ? "pro" : "premium"
  })
  const [busy, setBusy] = useState(false)
  const [billing, setBilling] = useState<Billing>("monthly")
  const [error, setError] = useState<string | null>(null)

  const welcomeParam = params.get("welcome")
  const welcome = welcomeParam === "1"
  const welcomePro = welcomeParam === "pro"
  const paymentError = params.get("error")
  const plan = PLANS.find((p) => p.id === planId)!
  const cur = useLocalCurrency()
  const money: Money = { currency: cur.currency, rate: cur.rate, converted: cur.ready && cur.isConverted }
  // The price callout must stay true when the card shows an estimate.
  const callouts: Callout[] = CALLOUTS[plan.id].map((c) =>
    c.target === "price" && money.converted && plan.pesewas > 0
      ? {
          ...c,
          title: t("pr.c.shownIn.t", { currency: money.currency }),
          body: t("pr.c.shownIn.b", { amount: ghsLabel(plan.pesewas) }),
        }
      : {
          ...c,
          title: t(`pr.c.${c.key === "allLivePro" ? "allLive" : c.key}.t` as MessageKey),
          body: t(`pr.c.${c.key}.b` as MessageKey),
        },
  )

  const choosePlan = (id: PlanId) => {
    setPlanId(id)
    setError(null)
  }

  // A pay-once plan that's still running can be topped up (31 more days,
  // starting when it ends). A renewing subscription can't be bought twice.
  const activeHere = plan.id === "pro" ? isPro : plan.id === "premium" ? isPremium && !isPro : false
  const topUp = activeHere && !renews

  async function checkout(e: React.FormEvent) {
    e.preventDefault()
    if (plan.id === "free") return
    const mode: Billing = topUp ? "once" : billing
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id, billing: mode }),
      })
      if (res.status === 401) {
        window.location.href = signInHref(plan.id)
        return
      }
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || t("pr.errStart"))
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pr.errGeneric"))
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
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c4b5fd]">{t("nav.pricing")}</p>
          <h1 className="mt-4 text-4xl leading-tight tracking-tight sm:text-6xl">
            <span className="font-extrabold">{t("pr.title1")}</span>{" "}
            <span className="block font-light text-white/90 sm:inline">{t("pr.title2")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/60 sm:text-lg">
            {t("pr.lead")}
          </p>
        </header>

        <div className="mx-auto mt-8 max-w-xl space-y-3">
          {welcome && <Notice tone="good">{t("pr.welcome")}</Notice>}
          {welcomePro && <Notice tone="good">{t("pr.welcomePro")}</Notice>}
          {paymentError && (
            <Notice tone="bad">
              {paymentError === "payment-expired"
                ? t("pr.err.expired")
                : paymentError === "payment-not-a-plan"
                  ? t("pr.err.notPlan", { email: CONTACT_EMAIL })
                  : t("pr.err.other", { code: paymentError, email: CONTACT_EMAIL })}
            </Notice>
          )}
          {isPremium && !welcome && !welcomePro && (
            <Notice tone="good">
              {renews
                ? t("pr.activeRenews", { plan: isPro ? "Pro" : "Premium" })
                : expiresAt
                  ? t("pr.activeUntil", { plan: isPro ? "Pro" : "Premium", date: new Date(expiresAt).toLocaleDateString(lang) })
                  : t("pr.active", { plan: isPro ? "Pro" : "Premium" })}
            </Notice>
          )}
        </div>

        {/* ---- plan switcher ---- */}
        <div role="tablist" aria-label={t("pr.plansAria")} className="mx-auto mt-10 flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur">
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
              {planName(p, t)}
            </button>
          ))}
        </div>

        {cur.ready && cur.availableRates && (
          <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-white/50">
            <label htmlFor="price-currency">{t("pr.pricesIn")}</label>
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
                    {c} — {currencyName(c, lang)}
                  </option>
                ))}
            </select>
            {money.converted && (
              <span className="basis-full text-center sm:basis-auto">
                {t("pr.estimate")} ·{" "}
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
              activeLabel={plan.id === "premium" && isPro ? t("pr.inPro") : t("pr.activeLabel")}
              topUp={topUp}
              activeUntil={expiresAt ? new Date(expiresAt).toLocaleDateString(lang) : null}
              billing={billing}
              onBilling={setBilling}
              accountEmail={user?.email ?? null}
              sessionLoading={sessionLoading}
              busy={busy}
              error={error}
              onSubmit={checkout}
              money={money}
            />
          )}
        </PlanStage>

        <p className="mt-14 text-center text-sm text-white/55">
          {t("pr.business")}{" "}
          <Link href="/advertise" className="font-semibold text-[#c4b5fd] hover:underline">
            {t("pr.advertise")}
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
  callouts: Callout[]
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
  topUp,
  activeUntil,
  billing,
  onBilling,
  accountEmail,
  sessionLoading,
  busy,
  error,
  onSubmit,
  money,
}: {
  plan: Plan
  refs: CardRefs
  active: boolean
  activeLabel: string
  /** Active on a pay-once plan: offer "add 31 days" instead of the active badge. */
  topUp: boolean
  activeUntil: string | null
  billing: Billing
  onBilling: (b: Billing) => void
  /** Signed-in user's email (the plan is billed to it); null = signed out. */
  accountEmail: string | null
  sessionLoading: boolean
  busy: boolean
  error: string | null
  onSubmit: (e: React.FormEvent) => void
  money: Money
}) {
  const { t } = useI18n()
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
            <h2 className="text-2xl font-medium">{planName(plan, t)}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-white/85">
              <Icon className="h-3.5 w-3.5 text-[#c4b5fd]" />
              {t(plan.badgeKey)}
            </span>
          </div>

          <div ref={refs.price} className="mt-6 flex items-baseline gap-1.5">
            {local ? (
              <>
                {plan.pesewas > 0 && (
                  <span className="text-2xl font-semibold text-white/55" title={t("pr.estimateTitle")}>
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
            {t(plan.termsKey)}
          </p>
          {local && plan.pesewas > 0 && (
            <p className="mt-1 text-xs text-white/50">
              {fillNodes(t("pr.chargedAs"), {
                amount: <span className="font-semibold text-white/75">{ghsLabel(plan.pesewas)}</span>,
              })}
            </p>
          )}

          <div ref={refs.cta} className="mt-6">
            {plan.id === "free" ? (
              <Link
                href="/app"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#12091f] shadow-[0_0_0_3px_rgba(139,92,246,0.55)] transition hover:bg-white/90"
              >
                {t("pr.openMap")} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : active && !topUp ? (
              <p className="rounded-full border border-[#a78bfa]/50 bg-[#8b5cf6]/15 px-5 py-3.5 text-center text-sm font-semibold text-[#ddd6fe]">
                {activeLabel}
              </p>
            ) : PREMIUM_ENABLED ? (
              <form onSubmit={onSubmit} className="space-y-3">
                {topUp ? (
                  <p className="rounded-full border border-[#a78bfa]/50 bg-[#8b5cf6]/15 px-5 py-2.5 text-center text-xs font-semibold text-[#ddd6fe]">
                    {activeUntil ? t("pr.activeTopUp", { date: activeUntil }) : t("pr.activeTopUpNoDate")}
                  </p>
                ) : (
                  <div role="radiogroup" aria-label={t("pr.howToPay")} className="grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
                    {BILLING_OPTIONS.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={billing === o.id}
                        onClick={() => onBilling(o.id)}
                        className={cn(
                          "rounded-full px-3 py-2 text-xs font-semibold leading-tight transition-colors",
                          billing === o.id ? "bg-white text-[#12091f]" : "text-white/65 hover:text-white",
                        )}
                      >
                        {t(o.labelKey)}
                        <span className={cn("block text-[10px] font-medium", billing === o.id ? "text-[#12091f]/60" : "text-white/45")}>
                          {t(o.subKey)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {accountEmail ? (
                  <p className="text-center text-xs text-white/55">
                    {fillNodes(t("pr.billedTo"), {
                      email: <span className="font-semibold text-white/80">{accountEmail}</span>,
                    })}
                  </p>
                ) : null}
                {accountEmail || sessionLoading ? (
                  <button
                    type="submit"
                    // Not gated on the session check: if it turns out they're
                    // signed out, checkout answers 401 and we send them to sign in.
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#12091f] shadow-[0_0_0_3px_rgba(139,92,246,0.55)] transition hover:bg-white/90 disabled:opacity-60"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {busy
                      ? t("pr.starting")
                      : topUp
                        ? t("pr.addDays", { amount: ghsLabel(plan.pesewas) })
                        : billing === "once"
                          ? t("pr.payFor", { amount: ghsLabel(plan.pesewas) })
                          : t("pr.subscribe", { plan: plan.name })}
                  </button>
                ) : (
                  <Link
                    href={signInHref(plan.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#12091f] shadow-[0_0_0_3px_rgba(139,92,246,0.55)] transition hover:bg-white/90"
                  >
                    {t("pr.signIn")} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                {error && <p className="text-center text-xs text-red-300">{error}</p>}
                <p className="text-center text-[11px] leading-snug text-white/55">
                  {topUp
                    ? t("pr.topUpNote", { amount: ghsLabel(plan.pesewas) })
                    : billing === "once"
                      ? t("pr.onceNote", { amount: ghsLabel(plan.pesewas) })
                      : t("pr.monthlyNote", { amount: ghsLabel(plan.pesewas) })}
                </p>
                <p className="text-center text-[11px] leading-snug text-white/40">
                  {fillNodes(t("pr.agree"), {
                    terms: <Link href="/terms" className={agreeLink}>{t("au.terms")}</Link>,
                    privacy: <Link href="/privacy" className={agreeLink}>{t("au.privacy")}</Link>,
                    refunds: <Link href="/refunds" className={agreeLink}>{t("pr.refunds")}</Link>,
                  })}
                </p>
              </form>
            ) : (
              <p className="rounded-full border border-dashed border-white/20 px-5 py-3 text-center text-xs text-white/55">
                {t("pr.notLive")}
              </p>
            )}
            {plan.id === "pro" && (
              <Link
                href="/business#talk-to-us"
                className="mt-3 block text-center text-xs font-semibold text-[#c4b5fd] hover:underline"
              >
                {t("pr.team")}
              </Link>
            )}
          </div>

          <ul ref={refs.features} className="mt-7 space-y-2.5 text-sm">
            {plan.leadKey && (
              <li className="pb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/45">{t(plan.leadKey)}</li>
            )}
            {plan.included.map((f) => (
              <li key={f.id} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#a78bfa]" aria-hidden />
                <span className="text-white/90">{featureText(f, t)}</span>
              </li>
            ))}
            {upsell && (
              <>
                <li className="pt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">
                  {t("pr.notIncluded", { tier: upsell.tier })}
                </li>
                {upsellShown.map((f) => (
                  <li key={f.id} className="flex items-start gap-2.5 text-white/35">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                    <span className="line-through decoration-white/30">{featureText(f, t)}</span>
                  </li>
                ))}
                {hidden > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setShowAllUpsell(true)}
                      className="text-xs font-semibold text-[#c4b5fd] hover:underline"
                    >
                      {t("pr.more", { n: hidden, tier: upsell.tier })}
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
