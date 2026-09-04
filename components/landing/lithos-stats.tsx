"use client"

import { useScrollReveal } from "@/hooks/use-scroll-reveal"

/* Deliberately factual, not invented usage metrics — this is a real
   company's site, so the numbers here are things that are actually
   true (Ghana's region count, the app's real travel modes) rather
   than made-up scale claims. */
const STATS = [
  { value: "16", label: "Regions of Ghana" },
  { value: "5", label: "Ways to travel" },
  { value: "24/7", label: "Live GPS routing" },
  { value: "100%", label: "Focused on Ghana" },
]

interface LithosStatsProps {
  /* Same "continue past the hero" handoff as the hero's own CTA —
     this section ends with a closing call to action. */
  onEnter?: () => void
}

/**
 * Third section: the closing beat — same eyebrow / Playfair-italic-
 * over-bold headline system as the two sections above it, a row of
 * honest facts instead of invented stats, and a final CTA back into
 * the app, on a near-black ground with a faint orange glow instead
 * of a flat fill or another video (enough variety to not read as a
 * repeat of the section above it).
 */
export function LithosStats({ onEnter }: LithosStatsProps) {
  const { ref, visible } = useScrollReveal<HTMLElement>()

  return (
    <section ref={ref} className="lithos-root relative bg-black py-24 sm:py-32 px-6 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(232, 112, 42, 0.12), transparent 60%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        <div className={visible ? "hero-anim hero-fade" : "opacity-0"}>
          <span className="block text-[#e8702a] text-xs font-semibold tracking-[0.3em] uppercase mb-4">
            Get moving
          </span>
          <h2 className="text-white leading-[1.05]">
            <span
              className="block font-playfair italic font-normal text-3xl sm:text-5xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              Wherever you&rsquo;re headed,
            </span>
            <span
              className="block font-normal text-3xl sm:text-5xl -mt-1"
              style={{ letterSpacing: "-0.03em" }}
            >
              we&rsquo;ll get you there
            </span>
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-y-10 gap-x-6">
          {STATS.map(({ value, label }, i) => (
            <div
              key={label}
              className={visible ? "hero-anim hero-fade" : "opacity-0"}
              style={visible ? { animationDelay: `${0.15 + i * 0.1}s` } : undefined}
            >
              <p
                className="font-playfair italic text-3xl sm:text-4xl text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                {value}
              </p>
              <p className="mt-2 text-white/50 text-xs sm:text-sm uppercase tracking-wider">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div
          className={`mt-16 ${visible ? "hero-anim hero-fade" : "opacity-0"}`}
          style={visible ? { animationDelay: "0.6s" } : undefined}
        >
          <button
            type="button"
            onClick={onEnter}
            className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-8 py-3.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30"
          >
            Start Exploring
          </button>
        </div>
      </div>
    </section>
  )
}
