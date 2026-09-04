"use client"

import { useEffect, useState } from "react"
import { Compass, Car, Bus, Motorbike, Footprints, MapPin, Search } from "lucide-react"
import { HeroGlobe } from "@/components/landing/hero-globe"
import { KineticType } from "@/components/landing/kinetic-type"
import { seeded } from "@/components/landing/destination-scene"

/* Deterministic star-field for Act 4's dark backdrop — same
   seeded-hash technique used everywhere else so server and client
   render identical positions (no hydration mismatch). */
const PLANET_STARS = Array.from({ length: 46 }).map((_, i) => ({
  top: `${seeded(i * 1.9 + 2) * 100}%`,
  left: `${seeded(i * 2.7 + 9) * 100}%`,
  size: 1 + seeded(i * 3.3 + 4) * 1.6,
  delay: `${seeded(i * 4.4 + 6) * 3.6}s`,
}))

interface CinematicIntroProps {
  onComplete: () => void
}

/* One act per beat of the brand-story brief, each held on screen
   for this many milliseconds before the next one crossfades in.
   ~30s total, matching the requested spot length without overstaying
   its welcome on a page people may watch more than once. */
const ACT_DURATIONS_MS = [3600, 3600, 3400, 4000, 3800, 3400, 3400, 3200, 3600]
const ACT_COUNT = ACT_DURATIONS_MS.length

/* ===========================================================
   ACT 1 — "EVERY MOMENT"
   A clean sky, a single search pill, a slow push-in.
=========================================================== */
function ActSky() {
  return (
    <div className="cine-act cine-act-enter">
      <div className="cine-sky" />
      <div className="cine-cloud" style={{ width: 220, height: 60, top: "18%", left: "8%", animationDuration: "30s" }} />
      <div className="cine-cloud" style={{ width: 160, height: 44, top: "30%", left: "62%", animationDuration: "24s", animationDirection: "reverse" }} />
      <div className="cine-cloud" style={{ width: 130, height: 38, top: "68%", left: "20%", animationDuration: "34s" }} />

      <div className="relative flex flex-col items-center">
        <div className="cine-searchpill">
          <Search className="w-5 h-5 text-[#0b1118]/40" />
          <span className="text-[#0b1118]/70 text-base sm:text-lg font-medium tracking-tight">
            Search anywhere...
          </span>
        </div>

        <KineticType
          text="EVERY MOMENT"
          delay={1400}
          className="mt-10 text-[#1c3a2e] font-extrabold text-4xl sm:text-6xl tracking-tight"
        />
      </div>
    </div>
  )
}

/* ===========================================================
   ACT 2 — "STARTS WITH 📍"
   The route breaks apart into every way to make the trip.
=========================================================== */
function ActTransportSwirl() {
  const icons = [
    { Icon: Footprints, top: "18%", left: "50%" },
    { Icon: Car, top: "42%", left: "80%" },
    { Icon: Bus, top: "76%", left: "64%" },
    { Icon: Motorbike, top: "76%", left: "36%" },
    { Icon: MapPin, top: "42%", left: "20%" },
  ]

  return (
    <div className="cine-act cine-act-enter">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #dcecf3 0%, #f2e9d6 55%, #f6dfb0 100%)" }}
      />

      <div className="relative w-[280px] h-[280px] sm:w-[380px] sm:h-[380px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
          {icons.map(({ top, left }, i) => {
            const x = parseFloat(left)
            const y = parseFloat(top)
            return (
              <path
                key={i}
                d={`M 50 50 Q ${(50 + x) / 2} ${(50 + y) / 2 - 8} ${x} ${y}`}
                pathLength={1}
                fill="none"
                stroke="#c17a3d"
                strokeWidth="0.6"
                strokeLinecap="round"
                className="cine-draw"
                style={{ animationDelay: `${300 + i * 140}ms` }}
              />
            )
          })}
        </svg>

        <div className="absolute w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
          <MapPin className="w-7 h-7 text-white" />
        </div>

        {icons.slice(0, 4).map(({ Icon, top, left }, i) => (
          <div
            key={i}
            className="cine-orbit-icon"
            style={{ top, left, transform: "translate(-50%,-50%)", animationDelay: `${500 + i * 150}ms` }}
          >
            <Icon className="w-6 h-6 text-[#c17a3d]" />
          </div>
        ))}
      </div>

      <KineticType
        text="STARTS WITH 📍"
        delay={1500}
        className="mt-10 text-[#1c3a2e] font-extrabold text-4xl sm:text-6xl tracking-tight"
      />
    </div>
  )
}

/* ===========================================================
   ACT 3 — the road
   Everything flows together into one smooth, glowing path.
=========================================================== */
function ActFlowingRoad() {
  return (
    <div className="cine-act cine-act-enter">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #f6dfb0 0%, #eccb8e 45%, #c17a3d 100%)" }}
      />
      <svg viewBox="0 0 400 300" className="w-[90%] max-w-2xl" aria-hidden="true">
        <defs>
          <linearGradient id="cine-road-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5a3d22" />
            <stop offset="100%" stopColor="#2a1c10" />
          </linearGradient>
        </defs>
        <path
          d="M 20 250 C 100 250 100 150 180 150 S 260 60 340 60"
          fill="none"
          stroke="url(#cine-road-grad)"
          strokeWidth="26"
          strokeLinecap="round"
          pathLength={1}
          className="cine-draw"
        />
        <path
          d="M 20 250 C 100 250 100 150 180 150 S 260 60 340 60"
          fill="none"
          stroke="#f6dfb0"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          className="cine-road-highlight"
        />
      </svg>
    </div>
  )
}

/* ===========================================================
   ACT 4 — "COMPUTED IN MILLISECONDS."
   A dark route-engine HUD: a faint city grid, several glowing
   candidate routes drawing themselves in parallel with a traveling
   light pulse once drawn, waypoint nodes pinging as they lock in,
   a sweeping scan line, and small monospace readouts — the "routing
   supercomputer" beat the rest of the intro builds toward.
=========================================================== */
const MAP_ROUTES: { d: string; color: string; delay: number; from: [number, number]; to: [number, number] }[] = [
  { d: "M 30 258 C 90 258 90 190 150 176 S 230 96 300 84 S 340 52 372 40", color: "#0a84ff", delay: 200, from: [30, 258], to: [372, 40] },
  { d: "M 372 250 C 320 250 300 190 250 178 S 150 150 110 120 S 60 80 26 58", color: "#4dd8ff", delay: 420, from: [372, 250], to: [26, 58] },
  { d: "M 66 24 C 100 60 90 120 140 150 S 260 190 300 230 S 320 260 340 278", color: "#ffcf8a", delay: 640, from: [66, 24], to: [340, 278] },
  { d: "M 16 150 C 80 130 120 170 170 150 S 260 130 320 150 S 360 160 392 150", color: "#34c759", delay: 860, from: [16, 150], to: [392, 150] },
  { d: "M 130 220 C 160 190 150 150 190 130 S 240 100 268 76", color: "#bf5af2", delay: 1080, from: [130, 220], to: [268, 76] },
]

const HUD_LINES = [
  "INDEXING 2,847,112 ROAD SEGMENTS",
  "EVALUATING 41,208 CANDIDATE ROUTES",
  "OPTIMAL PATH FOUND — 0.032s",
]

function ActMapCompute() {
  return (
    <div className="cine-act cine-act-enter">
      <div className="absolute inset-0 bg-[#060b14]" />
      <div className="cine-map-grid" />
      <div className="cine-scan-sweep" />

      <svg viewBox="0 0 400 300" className="relative w-[94%] max-w-3xl" aria-hidden="true">
        {MAP_ROUTES.map((route, i) => (
          <g key={i}>
            <path
              d={route.d}
              fill="none"
              stroke={route.color}
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.55"
              pathLength={1}
              className="cine-draw"
              style={{ animationDelay: `${route.delay}ms` }}
            />
            <path
              d={route.d}
              fill="none"
              stroke={route.color}
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={1}
              className="cine-route-pulse"
              style={{ animationDelay: `${route.delay + 900}ms`, color: route.color }}
            />
            {[route.from, route.to].map(([x, y], j) => (
              <circle
                key={j}
                cx={x}
                cy={y}
                r="3.2"
                fill={route.color}
                className="cine-node-ping"
                style={{ animationDelay: `${route.delay + j * 140}ms`, color: route.color }}
              />
            ))}
          </g>
        ))}
      </svg>

      <div className="cine-hud">
        <span className="cine-hud-eyebrow">ROUTE ENGINE</span>
        {HUD_LINES.map((line, i) => (
          <p key={line} className="cine-hud-line" style={{ animationDelay: `${300 + i * 700}ms` }}>
            <span className="cine-hud-caret">&gt;</span> {line}
          </p>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 mt-8">
        <KineticType
          text="MILLIONS OF PATHS"
          delay={2100}
          className="text-[#4dd8ff] text-xs sm:text-sm font-semibold tracking-[0.35em] uppercase"
        />
        <h2 className="text-white font-extrabold text-4xl sm:text-6xl tracking-tight mt-3">
          <KineticType text="COMPUTED IN MILLISECONDS." delay={2400} wordDelay={130} />
        </h2>
      </div>
    </div>
  )
}

/* ===========================================================
   ACT 5 — "CRAFTED FOR THE MOMENT."
   The globe quietly rises into frame from below, rim-lit against
   a starfield, with a small tracked-out eyebrow and a big serif
   headline settling above it — a "planet reveal" hero treatment
   (eyebrow label, serif word, glowing sphere cresting the bottom
   edge, faint flanking orbs) rather than the aperture-iris used
   before.
=========================================================== */
function ActPlanetRise() {
  return (
    <div className="cine-act cine-act-enter">
      <div className="absolute inset-0 bg-[#0a0f1a]" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PLANET_STARS.map((s, i) => (
          <span
            key={i}
            className="landing-star"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
          />
        ))}
      </div>

      <div className="cine-side-orb cine-side-orb-left" />
      <div className="cine-side-orb cine-side-orb-right" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <KineticType
          text="CRAFTED FOR"
          delay={300}
          className="text-[#8fb8d8] text-xs sm:text-sm font-semibold tracking-[0.35em] uppercase"
        />
        <h2 className="font-serif text-white text-4xl sm:text-6xl tracking-tight mt-3">
          <KineticType text="THE MOMENT." delay={700} wordDelay={160} />
        </h2>
        <div className="cine-headline-rule" />
      </div>

      <div className="cine-planet-rise">
        <HeroGlobe size={420} trails />
      </div>
    </div>
  )
}

/* ===========================================================
   ACT 6 — "TAKE IT SLOW."
   Traffic lines settle into slow, elegant abstract ribbons.
=========================================================== */
function ActRibbonsCool() {
  return (
    <div className="cine-act cine-act-enter">
      <div className="absolute inset-0 bg-[#0d1420]" />
      <svg viewBox="0 0 400 300" className="w-[92%] max-w-3xl" aria-hidden="true">
        <path className="cine-ribbon" d="M0 90 C 100 40 180 140 260 90 S 380 40 400 70" fill="none" stroke="#6fb3e0" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        <path className="cine-ribbon" style={{ animationDelay: "-1.5s" }} d="M0 150 C 110 200 190 90 270 150 S 380 210 400 170" fill="none" stroke="#3f7d4a" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        <path className="cine-ribbon" style={{ animationDelay: "-3s" }} d="M0 210 C 90 170 200 250 280 200 S 390 160 400 210" fill="none" stroke="#ffcf8a" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </svg>
      <KineticType
        text="TAKE IT SLOW."
        delay={1600}
        className="mt-6 text-white font-extrabold text-4xl sm:text-6xl tracking-tight"
      />
    </div>
  )
}

/* ===========================================================
   ACT 7 — "WAKE SOMETHING BEAUTIFUL."
   The same ribbons turn warm — energy, focus, a new day.
=========================================================== */
function ActRibbonsWarm() {
  return (
    <div className="cine-act cine-act-enter">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 40%, #7a3f1a 0%, #2a1608 70%, #170c05 100%)" }}
      />
      <svg viewBox="0 0 400 300" className="w-[92%] max-w-3xl" aria-hidden="true">
        <path className="cine-ribbon-warm" d="M0 130 C 120 60 180 220 260 130 S 380 60 400 100" fill="none" stroke="#ffcf8a" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        <path className="cine-ribbon-warm" style={{ animationDelay: "-1.2s" }} d="M0 180 C 100 240 200 100 280 180 S 380 240 400 190" fill="none" stroke="#c17a3d" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
        <path className="cine-ribbon-warm" style={{ animationDelay: "-2.4s" }} d="M40 90 C 140 150 160 30 260 90" fill="none" stroke="#f6dfb0" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
      </svg>
      <KineticType
        text="WAKE SOMETHING BEAUTIFUL."
        delay={1500}
        className="mt-6 text-[#fff3e0] font-extrabold text-4xl sm:text-6xl tracking-tight text-center px-6"
      />
    </div>
  )
}

/* ===========================================================
   ACT 8 — the hero shot
   Everything returns to the globe, lit like a product hero.
=========================================================== */
function ActHeroShot() {
  const pins = [
    { top: "22%", left: "18%" },
    { top: "68%", left: "78%" },
    { top: "30%", left: "82%" },
  ]

  return (
    <div className="cine-act cine-act-enter">
      <div className="absolute inset-0 bg-[#0a0f1a]" />
      <div className="relative">
        <HeroGlobe size={360} trails />
        {pins.map((p, i) => (
          <span
            key={i}
            className="cine-float-pin absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.5)]"
            style={{ ...p, animationDelay: `${i * 700}ms` }}
          />
        ))}
      </div>
      <p className="mt-8 text-white/70 text-sm sm:text-base tracking-[0.2em] uppercase">
        lincolnnavigation.com
      </p>
    </div>
  )
}

/* ===========================================================
   ACT 9 — brand end card
=========================================================== */
function ActEndCard() {
  return (
    <div className="cine-act cine-act-enter">
      <div className="absolute inset-0 bg-[#0a0f1a]" />
      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30 mb-6">
        <Compass className="w-8 h-8 text-white" />
      </div>
      <KineticType
        text="Lincoln Navigation"
        className="text-white font-extrabold text-4xl sm:text-6xl tracking-tight"
      />
      <KineticType
        text="FROM STEPS TO MILES"
        delay={900}
        wordDelay={140}
        className="mt-4 text-primary font-semibold text-sm sm:text-base tracking-[0.3em] uppercase"
      />
    </div>
  )
}

const ACTS = [
  ActSky,
  ActTransportSwirl,
  ActFlowingRoad,
  ActMapCompute,
  ActPlanetRise,
  ActRibbonsCool,
  ActRibbonsWarm,
  ActHeroShot,
  ActEndCard,
]

/**
 * The full ~30s brand-story sequence: a single search, breaking
 * into every way to travel, flowing into a road, a route-engine HUD
 * computing paths across a live map, opening on the globe, settling
 * through two moods (slow / energetic), a hero shot of the globe,
 * and a brand end card — one continuous crossfading sequence, not
 * separate slides.
 */
export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [actIndex, setActIndex] = useState(0)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (skipped) return

    if (actIndex >= ACT_COUNT - 1) {
      const finalHold = setTimeout(onComplete, ACT_DURATIONS_MS[ACT_COUNT - 1])
      return () => clearTimeout(finalHold)
    }

    const advance = setTimeout(
      () => setActIndex((i) => i + 1),
      ACT_DURATIONS_MS[actIndex]
    )
    return () => clearTimeout(advance)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actIndex, skipped])

  const handleSkip = () => {
    setSkipped(true)
    onComplete()
  }

  const Act = ACTS[actIndex]

  return (
    <div className="cine-root">
      <Act key={actIndex} />

      <button
        onClick={handleSkip}
        className="cine-skip absolute bottom-6 right-6 z-30 px-4 py-2 rounded-full bg-black/30 hover:bg-black/45 border border-white/20 text-white/80 text-xs font-semibold backdrop-blur-sm transition-colors"
      >
        Skip intro
      </button>
    </div>
  )
}
