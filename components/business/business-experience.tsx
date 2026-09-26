"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowUpLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Home,
  Layers,
  Mail,
  MapPin,
  Navigation,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BUSINESS_CAPABILITIES,
  BUSINESS_INTERESTS,
  BUSINESS_SEGMENTS,
  BUSINESS_SIZES,
} from "@/lib/business"
import { BusinessForm, type Lead } from "@/components/business/business-form"

const GLASS =
  "border border-white/70 bg-white/70 shadow-[0_8px_40px_rgba(30,41,59,0.18)] backdrop-blur-2xl"

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })

/** A labelled dropdown that looks like one segment of the reference's filter bar. */
function FilterField({
  icon,
  label,
  value,
  options,
  onChange,
  grow = 1,
}: {
  grow?: number
  icon: React.ReactNode
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label
      style={{ flexGrow: grow }}
      className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2 sm:px-4"
    >
      <span className="text-slate-500" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
          <span className="truncate">{value}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </span>
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

export function BusinessExperience() {
  const [lead, setLead] = useState<Lead>({
    type: BUSINESS_SEGMENTS[0].title,
    interest: BUSINESS_INTERESTS[0],
    size: BUSINESS_SIZES[0],
  })
  const patch = (p: Partial<Lead>) => setLead((l) => ({ ...l, ...p }))
  const featured =
    BUSINESS_SEGMENTS.find((s) => s.title === lead.type) ?? BUSINESS_SEGMENTS[0]
  const FeaturedIcon = featured.icon

  const talkAbout = (title: string) => {
    patch({ type: title })
    scrollTo("talk-to-us")
  }

  return (
    <div id="top" className="mx-auto w-full max-w-6xl px-3 pb-16 pt-4 sm:px-6">
      {/* ===== Hero frame ===== */}
      <section
        aria-label="Navigation for business"
        className="relative overflow-hidden rounded-[2rem] border-[5px] border-white/80 bg-slate-300 shadow-[0_30px_80px_rgba(30,41,59,0.28)] sm:rounded-[2.75rem]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/photos/monument.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[50%_8%] lg:object-[50%_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-900/20 via-transparent to-slate-900/30" />

        <div className="relative flex flex-col gap-4 p-3 sm:p-5 lg:block lg:h-[700px] lg:p-0">
          {/* Top bar: pill · filters · pill */}
          <div className="flex flex-wrap gap-3 lg:absolute lg:inset-x-6 lg:top-6 lg:flex-nowrap lg:items-center lg:justify-between">
            <button
              type="button"
              onClick={() => scrollTo("talk-to-us")}
              className={cn(
                GLASS,
                "flex flex-1 items-center justify-between gap-6 rounded-full px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white/90 active:scale-95 lg:min-w-[150px] lg:flex-none",
              )}
            >
              <ArrowUpLeft className="h-4 w-4 text-orange-400" aria-hidden />
              Talk to us
            </button>

            <div
              className={cn(
                GLASS,
                "order-3 flex w-full min-w-0 flex-col divide-y divide-slate-300/60 rounded-3xl sm:flex-row sm:divide-x sm:divide-y-0 sm:rounded-full lg:order-none lg:w-auto lg:max-w-2xl lg:flex-1",
              )}
            >
              <FilterField
                icon={<Users className="h-4 w-4" />}
                label="I am a"
                grow={1.6}
                value={lead.type}
                options={BUSINESS_SEGMENTS.map((s) => s.title)}
                onChange={(v) => patch({ type: v })}
              />
              <FilterField
                icon={<Navigation className="h-4 w-4" />}
                label="Interested in"
                value={lead.interest}
                options={BUSINESS_INTERESTS}
                onChange={(v) => patch({ interest: v })}
              />
              <FilterField
                icon={<Layers className="h-4 w-4" />}
                label="Scale"
                value={lead.size}
                options={BUSINESS_SIZES}
                onChange={(v) => patch({ size: v })}
              />
            </div>

            <Link
              href="/app"
              className={cn(
                GLASS,
                "flex flex-1 items-center justify-between gap-6 rounded-full px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white/90 active:scale-95 lg:min-w-[150px] lg:flex-none",
              )}
            >
              Open the map
              <ArrowUpRight className="h-4 w-4 text-orange-400" aria-hidden />
            </Link>
          </div>

          {/* Big translucent headline */}
          <div className="order-first py-10 text-center lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-[19%] lg:order-none lg:py-0">
            <h1 className="mx-auto max-w-4xl text-5xl font-medium leading-[1.02] tracking-tight text-white/85 drop-shadow-[0_2px_24px_rgba(30,64,175,0.35)] lg:text-white/75 sm:text-6xl lg:text-8xl">
              Navigation for every business
            </h1>
          </div>

          {/* Left rail (desktop) */}
          <nav
            aria-label="Sections"
            className={cn(
              GLASS,
              "hidden flex-col items-center gap-3 rounded-full px-2.5 py-3 lg:absolute lg:left-5 lg:top-[34%] lg:flex",
            )}
          >
            {[
              { icon: Home, label: "Top", go: () => scrollTo("top") },
              { icon: Users, label: "Who it's for", go: () => scrollTo("who") },
              { icon: Layers, label: "What's built", go: () => scrollTo("built") },
              { icon: Mail, label: "Talk to us", go: () => scrollTo("talk-to-us") },
            ].map(({ icon: Icon, label, go }, i) => (
              <button
                key={label}
                type="button"
                onClick={go}
                aria-label={label}
                title={label}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90",
                  i === 0
                    ? "bg-[#23206b] text-white"
                    : "text-slate-600 hover:bg-white hover:text-slate-900",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            ))}
            <Link
              href="/app"
              aria-label="Open the map"
              title="Open the map"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-900"
            >
              <Navigation className="h-[18px] w-[18px]" />
            </Link>
          </nav>

          {/* Intro copy */}
          <p className="rounded-2xl bg-slate-900/30 px-4 py-3 text-center text-sm leading-relaxed text-white shadow-lg backdrop-blur-md lg:absolute lg:left-24 lg:top-[49%] lg:max-w-[270px] lg:text-left">
            Routing, live guidance and Ghana-first maps for the companies, agencies and
            teams that move people and goods every day.
          </p>

          {/* Bottom-left: find the right fit */}
          <div
            className={cn(
              GLASS,
              "rounded-[1.75rem] p-5 lg:absolute lg:bottom-8 lg:left-24 lg:w-[340px]",
            )}
          >
            <h2 className="text-lg font-semibold text-slate-900">Find the right fit</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              From a pilot with ten drivers to a country-wide rollout — tell us who you
              are and we&rsquo;ll shape it around how you work.
            </p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-4xl font-semibold tracking-tight text-slate-900">
                  {BUSINESS_SEGMENTS.length}
                </p>
                <p className="text-xs text-slate-600">customer types</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {BUSINESS_SEGMENTS.slice(0, 4).map(({ id, icon: Icon }) => (
                    <span
                      key={id}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#e8e6ff] text-[#23206b]"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => scrollTo("who")}
                  aria-label="See who it's for"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white/70 text-slate-800 transition hover:bg-white active:scale-90"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="hidden lg:absolute lg:bottom-6 lg:right-[402px] lg:block">
            <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-[#23206b] shadow-2xl ring-4 ring-white/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/lincoln-navigation-mark.webp"
                alt="Lincoln Navigation"
                className="h-11 w-11 rounded-full object-cover"
              />
            </div>
          </div>

          {/* Bottom-right: featured customer type (follows the filter bar) */}
          <div
            className={cn(
              GLASS,
              "rounded-[1.75rem] p-5 lg:absolute lg:bottom-8 lg:right-8 lg:w-[360px]",
            )}
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <FeaturedIcon className="h-5 w-5 shrink-0 text-[#23206b]" aria-hidden />
                  <span className="truncate">{featured.title}</span>
                </h2>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3" aria-hidden /> Ghana &middot; nationwide
                </p>
              </div>
              <button
                type="button"
                onClick={() => talkAbout(featured.title)}
                aria-label={`Talk to us about ${featured.title}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white/80 text-slate-800 transition hover:bg-white active:scale-90"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">{featured.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {featured.highlights.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                >
                  <Check className="h-3 w-3 text-[#23206b]" aria-hidden />
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Who it's for ===== */}
      <section id="who" className="mt-16 scroll-mt-24" aria-labelledby="who-heading">
        <h2
          id="who-heading"
          className="text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl"
        >
          Who it&rsquo;s for
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_SEGMENTS.map(({ id, title, icon: Icon, body, highlights }) => {
            const active = title === lead.type
            return (
              <div
                key={id}
                className={cn(
                  GLASS,
                  "flex flex-col rounded-[1.75rem] p-5 transition hover:-translate-y-0.5 hover:bg-white/85",
                  active && "ring-2 ring-[#23206b]/60",
                )}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8e6ff] text-[#23206b]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{body}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                    >
                      {h}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => talkAbout(title)}
                  className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[#23206b] hover:underline"
                >
                  Talk to us about this <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== What's built + working with us ===== */}
      <section
        id="built"
        className="mt-16 grid scroll-mt-24 gap-5 md:grid-cols-2"
        aria-labelledby="what-heading"
      >
        <div className={cn(GLASS, "rounded-[2rem] p-6 sm:p-8")}>
          <h2
            id="what-heading"
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            What&rsquo;s already built
          </h2>
          <ul className="mt-5 space-y-3">
            {BUSINESS_CAPABILITIES.map((c) => (
              <li key={c} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#23206b] text-white">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={cn(GLASS, "rounded-[2rem] p-6 sm:p-8")}>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Working with us
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            We&rsquo;re opening access to business partners in stages. Tell us what you
            need — a pilot with a handful of drivers, an integration into your app, or a
            custom deployment — and we&rsquo;ll come back with what&rsquo;s possible now
            and what we can build together.
          </p>
        </div>
      </section>

      {/* ===== Form ===== */}
      <div className="mt-16 max-w-3xl">
        <BusinessForm lead={lead} onLeadChange={patch} />
      </div>
    </div>
  )
}
