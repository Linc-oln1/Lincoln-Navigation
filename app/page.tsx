"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Compass,
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
  region: string
  variant: SceneVariant
  // Original-wording summaries drawn from public historical
  // references (Wikipedia, Britannica, and Ghana Museums & Monuments
  // Board sources) — not quoted text. sourceUrl points visitors to
  // the primary reference for the full story.
  fact: string
  sourceUrl: string
  // Real photo path under /public, when one is available. Falls
  // back to the hand-drawn <DestinationScene> when omitted — e.g.
  // Kakum and Cape Coast Castle still use the illustration below
  // because no clean, unwatermarked photo has been supplied yet.
  photo?: string
}

const DESTINATIONS: Destination[] = [
  {
    id: "kakum",
    name: "Kakum National Park",
    region: "Central Region — Canopy Walkway",
    variant: "kakum",
    photo: "/landing/photos/kakum.jpg",
    fact:
      "Kakum began as a forest reserve in 1931 and wasn't formally protected as a national park until 1992, after local communities pushed for conservation over logging. Its rainforest canopy is crossed by a rope-and-plank walkway suspended roughly 40 metres up, stretching 350 metres across seven treetop platforms — built in the early 1990s and still one of only a handful of true canopy walkways anywhere in Africa. Beneath it live forest elephants, Diana monkeys, and giant bongo antelope, alongside more than 250 recorded bird species and over 600 kinds of butterflies.",
    sourceUrl: "https://en.wikipedia.org/wiki/Kakum_National_Park",
  },
  {
    id: "capecoast",
    name: "Cape Coast Castle",
    region: "Central Region — Atlantic Coast",
    variant: "capecoast",
    fact:
      "Cape Coast Castle began in 1653 as a Swedish timber trading post, then changed hands between Danish, Dutch, and English traders before England seized it for good in 1664 and rebuilt it in stone. For roughly two centuries afterward it operated as one of the largest slave-trading forts on the Gold Coast — its underground dungeons, cut directly into the bedrock, held hundreds of captured Africans at a time before they were marched through the castle's \"Door of No Return\" onto ships bound across the Atlantic. It's now preserved as a UNESCO World Heritage Site, one of the most visited memorials to the transatlantic slave trade in the world.",
    sourceUrl: "https://en.wikipedia.org/wiki/Cape_Coast_Castle",
  },
  {
    id: "monument",
    name: "Kwame Nkrumah Memorial Park",
    region: "Accra — Greater Accra",
    variant: "monument",
    photo: "/landing/photos/monument.jpg",
    fact:
      "This park sits on Accra's former colonial polo grounds — the same ground where Kwame Nkrumah declared Ghana's independence in 1957, making it the first sub-Saharan African nation to break from colonial rule. His mausoleum, completed in 1992, is shaped like an inverted sword (an Akan symbol of peace) and capped with a black star for African unity; Nkrumah and his wife Fathia are both buried inside. A major renovation finished in 2023, and the site now draws roughly 100,000 visitors a year to a museum tracing his life and Ghana's path to independence.",
    sourceUrl: "https://en.wikipedia.org/wiki/Kwame_Nkrumah_Mausoleum",
  },
  {
    id: "volta",
    name: "Lake Volta",
    region: "Eastern Region — World's Largest Reservoir",
    variant: "volta",
    photo: "/landing/photos/volta.jpg",
    fact:
      "Lake Volta was formed between 1961 and 1965, when the Akosombo Dam was built across the Volta River to power a planned aluminum industry. The reservoir behind it covers about 8,500 square kilometres — around 3.6% of Ghana's entire land area — making it the largest artificial lake in the world by surface area. Its turbines still generate over 1,000 megawatts of hydroelectric power for Ghana and its neighbors, though the dam's construction also displaced an estimated 80,000 people, a legacy the country continues to reckon with.",
    sourceUrl: "https://en.wikipedia.org/wiki/Akosombo_Dam",
  },
  {
    id: "mole",
    name: "Mole National Park",
    region: "Savannah Region — Wildlife Safari",
    variant: "mole",
    photo: "/landing/photos/mole.jpg",
    fact:
      "Mole started out as a wildlife refuge in 1958 and became a full national park in 1971; at over 4,500 square kilometres of savanna, it's now Ghana's largest protected area. Around 800 elephants roam its grasslands and waterholes today, alongside more than 90 other mammal species — hippos, buffalo, warthogs, and antelope like kob, roan, and hartebeest — plus over 340 recorded bird species. Sitting far from Ghana's densely populated south, Mole has remained one of the least disturbed ecosystems in West Africa and an important site for long-term wildlife research.",
    sourceUrl: "https://en.wikipedia.org/wiki/Mole_National_Park",
  },
]

const TRAVEL_MODES: { mode: TravelMode; icon: typeof Car; label: string }[] = [
  { mode: "driving", icon: Car, label: "Drive" },
  { mode: "motorcycle", icon: Motorbike, label: "Moto" },
  { mode: "bus", icon: Bus, label: "Bus" },
  { mode: "walking", icon: Footprints, label: "Walk" },
  { mode: "cycling", icon: Bike, label: "Bike" },
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

export default function LandingPage() {
  const router = useRouter()

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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Compass className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight text-white text-lg">
              Lincoln Navigation
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunchMap}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#0b1118] text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Launch Map
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleLaunchMap}
              aria-label="Launch map"
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
          ) : (
            <DestinationScene variant={current.variant} />
          )}

          {/* text */}
          <div className="absolute left-6 sm:left-14 top-[26%] sm:top-[30%] max-w-[85vw]">
            <p
              key={`eyebrow-${current.id}`}
              className="landing-fade-up text-primary font-semibold tracking-[0.25em] uppercase text-sm mb-2"
            >
              Ghana
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
              {current.region}
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
              {showFacts ? "Hide History & Facts" : "History & Facts"}
            </button>

            {showFacts && (
              <div className="landing-facts-panel mt-4 max-w-md max-h-[26vh] sm:max-h-[30vh] overflow-y-auto bg-black/55 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5">
                <p className="text-sm text-white/85 leading-relaxed">
                  {current.fact}
                </p>
                <a
                  href={current.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-primary text-xs font-semibold hover:underline"
                >
                  Read more on Wikipedia →
                </a>
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
                aria-label={`Show ${d.name}`}
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
            className="absolute left-6 right-6 sm:left-14 bottom-24 sm:bottom-16 sm:right-auto sm:w-[560px] z-10 landing-fade-up"
            style={{ animationDelay: "260ms" }}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl bg-black/[0.04]">
                <MapPin className="w-4 h-4 text-[#0b1118]/50 flex-shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Where to, near ${current.name.split(" ")[0]}...`}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[#0b1118] placeholder:text-[#0b1118]/40"
                />
              </div>

              <div className="flex items-center gap-1 px-1 overflow-x-auto sm:overflow-visible">
                {TRAVEL_MODES.map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTravelMode(mode)}
                    title={label}
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
                Get Directions
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
          <LithosStats onEnter={handleIntroComplete} />
        </>
      )}

      {phase === "destination" && <ProductShowcase />}
    </main>
  )
}
