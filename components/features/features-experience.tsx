"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowLeft,
  Bike,
  Bus,
  Car,
  CloudSun,
  Footprints,
  LocateFixed,
  Menu,
  Motorbike,
  Navigation,
  ShieldAlert,
  Smartphone,
  Route,
  X,
} from "lucide-react"
import { AccountLink } from "@/components/site/account-link"
import { DestinationConditions, mapHref } from "@/components/features/destination-conditions"
import { GHANA_DESTINATIONS } from "@/lib/ghana-destinations"
import { cn } from "@/lib/utils"

type TravelMode = "driving" | "motorcycle" | "bus" | "walking" | "cycling"

const MODES: { mode: TravelMode; icon: typeof Car; label: string }[] = [
  { mode: "driving", icon: Car, label: "Drive" },
  { mode: "bus", icon: Bus, label: "Trotro" },
  { mode: "motorcycle", icon: Motorbike, label: "Moto" },
  { mode: "walking", icon: Footprints, label: "Walk" },
  { mode: "cycling", icon: Bike, label: "Bike" },
]

const NAV = [
  { label: "Features", href: "/features" },
  { label: "Live Map", href: "/app" },
  { label: "Pricing", href: "/pricing" },
  { label: "Business", href: "/business" },
  { label: "About", href: "/about" },
]

const PERKS = [
  { icon: ShieldAlert, label: "Live hazard alerts" },
  { icon: Route, label: "Every way you move" },
  { icon: CloudSun, label: "Weather on the map" },
  { icon: Smartphone, label: "Free to install" },
]

const STATS = [
  { value: "16", label: "Regions mapped" },
  { value: "5", label: "Ways to travel" },
  { value: `${GHANA_DESTINATIONS.length}`, label: "Places featured here" },
  { value: "GHS 0", label: "To start navigating" },
]

// Ink and accent pulled from the wallpaper's own palette — slate
// from the east of the map, the brand orange for actions.
const INK = "#1c2a33"
const ACCENT = "#e8702a"

// Frosted cream for anything that sits on top of the wallpaper; the
// wallpaper itself is never tinted or scrimmed.
const GLASS = "bg-[#f4f1e8]/80 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_-20px_rgba(28,42,51,0.35)]"

/**
 * /features — a travel-style landing for Ghana's attractions over the
 * Africa-map wallpaper. The route card hands off to /app the same way
 * the home page's planner does (/app?to=…&mode=…).
 */
export function FeaturesExperience({ displayFont }: { displayFont: string }) {
  const router = useRouter()
  const railRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(GHANA_DESTINATIONS[0].id)
  const [to, setTo] = useState(GHANA_DESTINATIONS[0].name)
  const [mode, setMode] = useState<TravelMode>("driving")
  const [showAll, setShowAll] = useState(false)

  const selected = GHANA_DESTINATIONS.find((d) => d.id === selectedId)

  const pick = (id: string) => {
    const d = GHANA_DESTINATIONS.find((x) => x.id === id)
    if (!d) return
    setSelectedId(id)
    setTo(d.name)
  }

  const scrollRail = (dir: 1 | -1) =>
    railRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" })

  const planRoute = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = to.trim()
    // While the field still names the picked place, route to its exact
    // coordinates; otherwise geocode whatever the visitor typed.
    if (selected && trimmed === selected.name) {
      router.push(mapHref(selected, mode))
      return
    }
    const params = new URLSearchParams({ mode })
    if (trimmed) params.set("to", trimmed)
    router.push(`/app?${params.toString()}`)
  }

  return (
    <div className="lithos-root relative min-h-screen overflow-x-clip" style={{ color: INK, backgroundColor: "#d2d0c3" }}>
      {/* ---- wallpaper ----
           Fixed behind everything, untouched: the full poster on the
           right at viewport height on desktop (so it stays sharp),
           full-bleed on phones. Only its left edge is feathered into
           the matching paper colour so there's no seam. */}
      <div
        aria-hidden
        className="features-wallpaper pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat lg:bg-right lg:[background-size:auto_100%]"
        style={{ backgroundImage: "url('/features/africa-wallpaper.jpg')" }}
      />

      <div className="relative z-10">
        {/* ---- header ---- */}
        <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 rounded-2xl bg-[#f4f1e8]/80 py-1.5 pl-1.5 pr-4 backdrop-blur-xl lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/lincoln-navigation-logo.webp" alt="" aria-hidden className="h-10 w-auto" />
            <span className="leading-tight">
              <span className="block text-xs sm:text-sm font-bold tracking-[0.18em] uppercase">Lincoln Navigation</span>
              <span className="hidden sm:block text-[10px] tracking-[0.25em] uppercase opacity-60">Explore · Route · Arrive</span>
            </span>
          </Link>

          <nav className={cn("hidden lg:flex items-center gap-1 rounded-full px-2 py-1.5", GLASS)}>
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  l.href === "/features" ? "bg-[#1c2a33] text-white" : "hover:bg-black/5",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <AccountLink className={cn("rounded-full px-4 py-2 text-sm font-semibold", GLASS)} />
            </span>
            <a
              href="#plan"
              className="hidden sm:inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ backgroundColor: ACCENT }}
            >
              Plan Your Trip <ArrowRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className={cn("lg:hidden flex h-10 w-10 items-center justify-center rounded-full", GLASS)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className={cn("mx-4 -mt-2 mb-4 flex flex-col rounded-2xl p-2 lg:hidden", GLASS)}>
            {NAV.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-base font-medium hover:bg-black/5">
                {l.label}
              </Link>
            ))}
            <span className="flex px-2 py-2 sm:hidden">
              <AccountLink onNavigate={() => setMenuOpen(false)} fullWidth className="w-full rounded-xl border border-black/10 px-4 py-3 text-center text-base font-semibold" />
            </span>
          </div>
        )}

        {/* ---- hero ---- */}
        <section className="mx-auto grid max-w-7xl gap-8 px-4 pt-6 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12 lg:pt-14">
          <div className={cn("rounded-3xl p-6 sm:p-8 lg:rounded-none lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:border-0 lg:shadow-none", GLASS)}>
            <p className="hero-anim hero-fade flex items-center gap-3 text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: ACCENT }}>
              <span className="h-px w-8" style={{ backgroundColor: ACCENT }} />
              Ghana is waiting
            </p>
            <h1
              className={cn(displayFont, "hero-anim hero-fade mt-5 max-w-[11ch] text-[2.6rem] leading-[1.02] sm:text-6xl xl:text-7xl")}
              style={{ animationDelay: "0.08s", letterSpacing: "-0.02em" }}
            >
              Find Your Way to Ghana&apos;s Wonders
            </h1>
            <span className="mt-6 block h-px w-12 bg-current opacity-30" />
            <p className="hero-anim hero-fade mt-6 max-w-md text-base leading-relaxed opacity-80" style={{ animationDelay: "0.16s" }}>
              Castles on the coast, walkways above the rainforest, waterfalls and elephants — and
              turn-by-turn routes to every one of them, by car, trotro, moto or on foot.
            </p>
            <div className="hero-anim hero-fade mt-8 flex flex-wrap items-center gap-5" style={{ animationDelay: "0.24s" }}>
              <a
                href="#destinations"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                style={{ backgroundColor: ACCENT }}
              >
                Explore Destinations <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/app" className="group inline-flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-current/30 transition group-hover:bg-[#1c2a33] group-hover:text-white">
                  <Navigation className="h-4 w-4" />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">Open the Live Map</span>
                  <span className="block text-xs opacity-60">See it work in your browser</span>
                </span>
              </Link>
            </div>
          </div>

          {/* ---- where to next? ---- */}
          <form id="plan" onSubmit={planRoute} className={cn("hero-anim hero-fade scroll-mt-6 self-start rounded-3xl p-5", GLASS)} style={{ animationDelay: "0.3s" }}>
            <h2 className="text-xl font-semibold">Where to next?</h2>
            <p className="mt-1 text-sm opacity-60">Pick a place, choose how you&apos;re going.</p>

            <div className="mt-4 grid grid-cols-5 gap-1 border-b border-black/10 pb-3">
              {MODES.map(({ mode: m, icon: Icon, label }) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
                    mode === m ? "bg-[#1c2a33] text-white" : "opacity-70 hover:bg-black/5 hover:opacity-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-black/10 bg-white/60">
              <div className="flex items-center gap-3 px-4 py-3">
                <LocateFixed className="h-4 w-4 flex-shrink-0" style={{ color: ACCENT }} />
                <div className="min-w-0">
                  <p className="text-[11px] opacity-55">From</p>
                  <p className="text-sm font-medium">Your current location</p>
                </div>
              </div>
              <div className="border-t border-black/10 px-4 py-3">
                <label htmlFor="features-to" className="block text-[11px] opacity-55">To</label>
                <input
                  id="features-to"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Search a place in Ghana"
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:opacity-40"
                />
              </div>
            </div>

            {selected && to === selected.name && <DestinationConditions destination={selected} />}

            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ backgroundColor: ACCENT }}
            >
              Get Directions <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>

        {/* ---- popular destinations + perks ---- */}
        <section id="destinations" className="mx-auto grid max-w-7xl scroll-mt-6 gap-6 px-4 pb-8 sm:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)] xl:items-end">
          <div className="min-w-0">
            <div className={cn("mb-4 inline-flex items-center gap-5 rounded-full px-5 py-2", GLASS)}>
              <h2 className="text-lg font-semibold">Popular Destinations</h2>
              <button type="button" onClick={() => setShowAll((s) => !s)} className="text-sm font-semibold" style={{ color: ACCENT }}>
                {showAll ? "Show less" : "View all"}
              </button>
            </div>

            {showAll ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {GHANA_DESTINATIONS.map((d) => (
                  <DestinationCard key={d.id} d={d} active={d.id === selectedId} onPick={pick} className="w-full" />
                ))}
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => scrollRail(-1)}
                  aria-label="Previous destinations"
                  className={cn("absolute -left-3 top-[38%] z-10 hidden h-9 w-9 items-center justify-center rounded-full sm:flex", GLASS)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div ref={railRef} className="features-rail flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                  {GHANA_DESTINATIONS.map((d) => (
                    <DestinationCard key={d.id} d={d} active={d.id === selectedId} onPick={pick} className="w-[200px] flex-shrink-0 snap-start" />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => scrollRail(1)}
                  aria-label="More destinations"
                  className={cn("absolute -right-3 top-[38%] z-10 hidden h-9 w-9 items-center justify-center rounded-full sm:flex", GLASS)}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className={cn("grid grid-cols-2 sm:grid-cols-4 rounded-3xl", GLASS)}>
            {PERKS.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className={cn(
                  "flex flex-col items-center gap-3 px-3 py-6 text-center",
                  i > 0 && "sm:border-l border-black/10",
                  i % 2 === 1 && "border-l border-black/10",
                  i >= 2 && "border-t sm:border-t-0",
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={1.6} />
                <span className="text-xs font-medium leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---- stats ---- */}
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-8">
          <div className={cn("grid grid-cols-2 gap-y-6 rounded-3xl px-6 py-6 md:grid-cols-4", GLASS)}>
            {STATS.map((s) => (
              <div key={s.label} className="text-center md:text-left md:pl-6 md:first:pl-0">
                <p className={cn(displayFont, "text-3xl")}>{s.value}</p>
                <p className="mt-1 text-xs tracking-wide uppercase opacity-60">{s.label}</p>
              </div>
            ))}
          </div>

          <details className={cn("mt-4 rounded-2xl px-5 py-3 text-xs", GLASS)}>
            <summary className="cursor-pointer font-semibold">Photo credits</summary>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {GHANA_DESTINATIONS.map((d) => (
                <li key={d.id} className="opacity-75">
                  {d.name}:{" "}
                  <a href={d.credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {d.credit.author}
                  </a>
                  , {d.credit.licence}, via Wikimedia Commons
                </li>
              ))}
            </ul>
          </details>
        </section>
      </div>
    </div>
  )
}

function DestinationCard({
  d,
  active,
  onPick,
  className,
}: {
  d: (typeof GHANA_DESTINATIONS)[number]
  active: boolean
  onPick: (id: string) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onPick(d.id)
        document.getElementById("plan")?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }}
      aria-pressed={active}
      className={cn(
        "group overflow-hidden rounded-2xl text-left transition",
        GLASS,
        active ? "ring-2 ring-[#e8702a]" : "hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={d.photo}
          alt={d.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-semibold">{d.name}</p>
        <p className="mt-0.5 flex items-center justify-between gap-2 text-[11px] opacity-60">
          <span className="truncate">{d.region}</span>
          <span className="flex-shrink-0 rounded-full bg-black/5 px-2 py-0.5">{d.category}</span>
        </p>
      </div>
    </button>
  )
}
