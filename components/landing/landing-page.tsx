"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Car,
  Bike,
  Footprints,
  Bus,
  Motorbike,
  MapPin,
  Menu,
  History,
  X,
} from "lucide-react"
import { DestinationScene, seeded, type SceneVariant } from "@/components/landing/destination-scene"
import { DestinationPhoto } from "@/components/landing/destination-photo"
import { LithosHero } from "@/components/landing/lithos-hero"
import { LithosFeatures } from "@/components/landing/lithos-features"
import { LithosStats } from "@/components/landing/lithos-stats"
import { ProductShowcase } from "@/components/landing/product-showcase"
import { PopularRoutes } from "@/components/landing/popular-routes"
import { AdSlot } from "@/components/ads/ad-slot"
import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"
import { SiteFooter } from "@/components/site/site-footer"
import { AccountLink } from "@/components/site/account-link"
import { GHANA_DESTINATIONS } from "@/lib/ghana-destinations"

/* =========================================================
   LANDING PAGE

   A cinematic splash for LincolnNavigation.com — a rotating
   globe settles onto "GHANA", then cycles through real Ghanaian
   destinations, each with a working "Plan a route" widget that
   hands off straight into the live map at /app.
========================================================= */

type Phase = "intro" | "destination"

type TravelMode = "driving" | "motorcycle" | "bus" | "walking" | "cycling"

interface Destination {
  id: string
  name: string
  // Hand-drawn <DestinationScene> fallback, only needed for a place
  // without a photo.
  variant?: SceneVariant
  // The subtitle and "History & Facts" text are translated, under
  // hs.region.<id> / hs.fact.<id> in lib/i18n/home-messages.ts —
  // original-wording summaries drawn from public historical references
  // (Wikipedia, Britannica, and Ghana Museums & Monuments Board
  // sources), not quoted text. sourceUrl points visitors to the
  // primary reference for the full story.
  sourceUrl: string
  // Real photo path under /public, when one is available.
  photo?: string
  // Required for CC-licensed photos (Wikimedia Commons); shown under
  // the facts panel and listed on /attributions.
  photoCredit?: { author: string; licence: string; source: string }
}

const commonsCredit = (id: string) => {
  const d = GHANA_DESTINATIONS.find((x) => x.id === id)
  if (!d) throw new Error(`No Commons credit for ${id}`)
  return d.credit
}

const DESTINATIONS: Destination[] = [
  {
    id: "kakum",
    name: "Kakum National Park",
    variant: "kakum",
    photo: "/landing/photos/kakum.webp",
    sourceUrl: "https://en.wikipedia.org/wiki/Kakum_National_Park",
  },
  {
    id: "capecoast",
    name: "Cape Coast Castle",
    variant: "capecoast",
    photo: "/landing/photos/cape-coast.webp",
    photoCredit: commonsCredit("cape-coast"),
    sourceUrl: "https://en.wikipedia.org/wiki/Cape_Coast_Castle",
  },
  {
    id: "elmina",
    name: "Elmina Castle",
    photo: "/landing/photos/elmina.webp",
    photoCredit: commonsCredit("elmina"),
    sourceUrl: "https://en.wikipedia.org/wiki/Elmina_Castle",
  },
  {
    id: "monument",
    name: "Kwame Nkrumah Memorial Park",
    variant: "monument",
    photo: "/landing/photos/monument.webp",
    sourceUrl: "https://en.wikipedia.org/wiki/Kwame_Nkrumah_Mausoleum",
  },
  {
    id: "volta",
    name: "Lake Volta",
    variant: "volta",
    photo: "/landing/photos/volta.webp",
    sourceUrl: "https://en.wikipedia.org/wiki/Akosombo_Dam",
  },
  {
    id: "wli",
    name: "Wli Waterfalls",
    photo: "/landing/photos/wli.webp",
    photoCredit: commonsCredit("wli"),
    sourceUrl: "https://en.wikipedia.org/wiki/Wli_waterfalls",
  },
  {
    id: "mole",
    name: "Mole National Park",
    variant: "mole",
    photo: "/landing/photos/mole.webp",
    sourceUrl: "https://en.wikipedia.org/wiki/Mole_National_Park",
  },
  {
    id: "larabanga",
    name: "Larabanga Mosque",
    photo: "/landing/photos/larabanga.webp",
    photoCredit: commonsCredit("larabanga"),
    sourceUrl: "https://en.wikipedia.org/wiki/Larabanga_Mosque",
  },
]

// Labels come from the shared mode.* translations.
const TRAVEL_MODES: { mode: TravelMode; icon: typeof Car }[] = [
  { mode: "driving", icon: Car },
  { mode: "motorcycle", icon: Motorbike },
  { mode: "bus", icon: Bus },
  { mode: "walking", icon: Footprints },
  { mode: "cycling", icon: Bike },
]

const DESTINATION_DURATION_MS = 6000

function Starfield({ count = 60 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const size = 1 + seeded(i * 3.1) * 1.8
        return (
          <span
            key={i}
            className="landing-star"
            style={{
              top: `${seeded(i * 1.7) * 100}%`,
              left: `${seeded(i * 2.3 + 5) * 100}%`,
              width: size,
              height: size,
              animationDelay: `${seeded(i * 4.1) * 3.6}s`,
            }}
          />
        )
      })}
    </div>
  )
}

export function LandingPage() {
  const router = useRouter()

  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>("intro")
  const [destinationIndex, setDestinationIndex] = useState(0)
  const [query, setQuery] = useState("")
  const [travelMode, setTravelMode] = useState<TravelMode>("driving")
  const [showFacts, setShowFacts] = useState(false)

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Collapse the facts panel whenever the destination changes, so it
  // doesn't stay pinned open over the next place's photo.
  useEffect(() => {
    setShowFacts(false)
  }, [destinationIndex])

  const handleIntroComplete = useCallback(() => {
    setDestinationIndex(0)
    setPhase("destination")
  }, [])

  /* ---- auto-advance through destinations; resets whenever the
     user manually jumps to one, since that changes destinationIndex ---- */

  useEffect(() => {
    if (phase !== "destination") return

    if (advanceTimer.current) clearTimeout(advanceTimer.current)

    advanceTimer.current = setTimeout(() => {
      setDestinationIndex((i) => (i + 1) % DESTINATIONS.length)
    }, DESTINATION_DURATION_MS)

    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [phase, destinationIndex])

  const jumpTo = useCallback((index: number) => {
    setDestinationIndex(index)
    setPhase("destination")
  }, [])

  const handleLaunchMap = useCallback(() => {
    router.push("/app")
  }, [router])

  const handlePlanRoute = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = query.trim()
      const params = new URLSearchParams()
      if (trimmed) params.set("to", trimmed)
      params.set("mode", travelMode)
      router.push(`/app?${params.toString()}`)
    },
    [query, travelMode, router]
  )

  const current = DESTINATIONS[destinationIndex]

  return (
    <main className="landing-page">
    <div className="landing-hero">
      <Starfield />

      {/* ---- top nav ----
           Only shown in the destination phase — the hero below
           brings its own full nav bar for the intro phase. */}
      {phase === "destination" && (
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 sm:px-10 py-5">
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/lincoln-navigation-logo.webp"
              alt="Lincoln Navigation"
              className="h-10 sm:h-12 w-auto"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white">
              <AccountLink className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 sm:px-5 sm:py-2.5" />
            </span>
            <button
              onClick={handleLaunchMap}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#0b1118] text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              {t("home.launch")}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleLaunchMap}
              aria-label={t("home.launch")}
              className="sm:hidden w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* ---- HERO ---- */}
      {phase === "intro" && <LithosHero onEnter={handleIntroComplete} />}

      {/* ---- DESTINATION PHASE ---- */}
      {phase === "destination" && current && (
        <div key={current.id} className="absolute inset-0 landing-zoom-in">
          {current.photo ? (
            <DestinationPhoto src={current.photo} alt={current.name} />
          ) : current.variant ? (
            <DestinationScene variant={current.variant} />
          ) : null}

          {/* text */}
          <div className="absolute left-6 sm:left-14 top-[26%] sm:top-[30%] max-w-[85vw]">
            <p
              key={`eyebrow-${current.id}`}
              className="landing-fade-up text-primary font-semibold tracking-[0.25em] uppercase text-sm mb-2"
            >
              {t("hs.eyebrow")}
            </p>
            <h2
              key={`title-${current.id}`}
              className="landing-fade-up text-white font-extrabold text-4xl sm:text-6xl leading-[1.05] tracking-tight"
              style={{ animationDelay: "80ms" }}
            >
              {current.name}
            </h2>
            <p
              key={`region-${current.id}`}
              className="landing-fade-up text-white/70 mt-3 text-sm sm:text-base"
              style={{ animationDelay: "160ms" }}
            >
              {t(`hs.region.${current.id}` as MessageKey)}
            </p>

            <button
              key={`facts-btn-${current.id}`}
              onClick={() => setShowFacts((s) => !s)}
              className="landing-fade-up mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold backdrop-blur-sm transition-colors"
              style={{ animationDelay: "220ms" }}
            >
              {showFacts ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <History className="w-3.5 h-3.5" />
              )}
              {showFacts ? t("home.hideFacts") : t("home.facts")}
            </button>

            {showFacts && (
              <div className="landing-facts-panel mt-4 max-w-md max-h-[26vh] sm:max-h-[30vh] overflow-y-auto bg-black/55 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5">
                <p className="text-sm text-white/85 leading-relaxed">
                  {t(`hs.fact.${current.id}` as MessageKey)}
                </p>
                <a
                  href={current.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-primary text-xs font-semibold hover:underline"
                >
                  {t("hs.readMore")}
                </a>
                {current.photoCredit && (
                  <p className="mt-2 text-[11px] text-white/50">
                    {t("hs.photo")}{" "}
                    <a
                      href={current.photoCredit.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-white/80"
                    >
                      {current.photoCredit.author}
                    </a>
                    , {current.photoCredit.licence}, {t("ft.via")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* destination quick-list, right edge */}
          <div className="hidden md:flex flex-col gap-4 absolute right-10 top-1/2 -translate-y-1/2 z-10">
            {DESTINATIONS.map((d, i) => (
              <button
                key={d.id}
                onClick={() => jumpTo(i)}
                className="flex items-center justify-end gap-3 group"
              >
                <span
                  className={`text-xs font-semibold tracking-wider uppercase transition-colors ${
                    i === destinationIndex
                      ? "text-white"
                      : "text-white/45 group-hover:text-white/80"
                  }`}
                >
                  {d.name}
                </span>
                <span
                  className={`rounded-full transition-all ${
                    i === destinationIndex
                      ? "w-2.5 h-2.5 bg-primary"
                      : "w-1.5 h-1.5 bg-white/40 group-hover:bg-white/70"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* pagination dots, bottom-left */}
          <div className="absolute left-6 sm:left-14 bottom-6 flex items-center gap-2 z-10">
            {DESTINATIONS.map((d, i) => (
              <button
                key={d.id}
                onClick={() => jumpTo(i)}
                aria-label={t("hs.show", { name: d.name })}
                className={`rounded-full transition-all ${
                  i === destinationIndex
                    ? "w-6 h-1.5 bg-primary"
                    : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          {/* ---- plan a route widget ---- */}
          <form
            onSubmit={handlePlanRoute}
            // On phones the open facts panel reaches down to where this
            // sits, so step aside until the facts are closed.
            className={`absolute left-6 right-6 sm:left-14 bottom-24 sm:bottom-16 sm:right-auto sm:w-[560px] z-10 landing-fade-up ${
              showFacts ? "hidden sm:block" : ""
            }`}
            style={{ animationDelay: "260ms" }}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-black/[0.04]">
                <MapPin className="w-4 h-4 text-[#0b1118]/50 flex-shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("hs.wherePh", { place: current.name.split(" ")[0] })}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[#0b1118] placeholder:text-[#0b1118]/40"
                />
              </div>

              <div className="flex items-center gap-1 px-1 overflow-x-auto sm:overflow-visible">
                {TRAVEL_MODES.map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTravelMode(mode)}
                    title={t(`mode.${mode}` as MessageKey)}
                    aria-label={t(`mode.${mode}` as MessageKey)}
                    className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      travelMode === mode
                        ? "bg-primary text-white"
                        : "text-[#0b1118]/50 hover:bg-black/[0.06]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition-[filter] flex-shrink-0"
              >
                {t("dir.get")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>

      {/* ---- LITHOS SECTIONS ----
           Continue the hero's story while still in the intro phase;
           once a visitor moves into the destination phase, this
           gives way to the real Ghana-map product tour below. */}
      {phase === "intro" && (
        <>
          <LithosFeatures />
          <div className="bg-background px-6 py-10">
            <AdSlot name="landingInline" />
          </div>
          <LithosStats onEnter={handleIntroComplete} />
        </>
      )}

      {phase === "destination" && <ProductShowcase />}
      <PopularRoutes />
      <SiteFooter />
    </main>
  )
}
