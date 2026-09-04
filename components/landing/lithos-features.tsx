"use client"

import { MapPin, Radio, Navigation, Mail } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const FEATURES = [
  {
    id: "local",
    icon: MapPin,
    title: "Built for Ghana",
    description:
      "Every road, roundabout, and market street mapped by people who actually drive them — not a global template stretched thin.",
  },
  {
    id: "live",
    icon: Radio,
    title: "Live, not static",
    description:
      "Real-time positioning and route recalculation, so a closed road or a new detour never leaves you stuck.",
  },
  {
    id: "modes",
    icon: Navigation,
    title: "However you move",
    description:
      "Drive, ride a moto, catch a trotro, walk, or cycle — one map, every way people actually get around.",
  },
  {
    id: "contact",
    icon: Mail,
    title: "We're listening",
    description: "Spot a wrong turn or a missing landmark? Tell us and we'll fix it.",
  },
]

/**
 * Second section: the company's own mission statement, over a full-
 * bleed autoplaying video with no scrim — same eyebrow / Playfair-
 * italic-over-bold headline system as the hero, at section scale.
 * Cards keep a touch more background opacity than the geology-themed
 * draft this replaced, since there's no dark overlay to lean on for
 * contrast against a brighter, busier video.
 */
export function LithosFeatures() {
  const { ref, visible } = useScrollReveal<HTMLElement>()

  return (
    <section
      ref={ref}
      id="about"
      className="lithos-root relative bg-black py-24 sm:py-32 px-6 sm:px-10 overflow-hidden scroll-mt-24"
    >
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        src="/landing/video/about-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className={visible ? "hero-anim hero-fade" : "opacity-0"}>
          <span className="block text-[#e8702a] text-xs font-semibold tracking-[0.3em] uppercase mb-4">
            Our mission
          </span>
          <h2 className="text-white leading-[1.05]">
            <span
              className="block font-playfair italic font-normal text-3xl sm:text-5xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              From steps
            </span>
            <span
              className="block font-normal text-3xl sm:text-5xl -mt-1"
              style={{ letterSpacing: "-0.03em" }}
            >
              to miles, we map the way
            </span>
          </h2>
          <p className="mt-6 max-w-xl text-white/80 text-sm sm:text-base leading-relaxed">
            Lincoln Navigation exists to make getting around Ghana simple — accurate, live, and
            built for how people actually travel here, from a walk to the corner store to a
            drive across regions.
          </p>
        </div>

        <div id="features" className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 scroll-mt-24">
          {FEATURES.map(({ id, icon: Icon, title, description }, i) => (
            <div
              key={id}
              id={id}
              className={`rounded-2xl border border-white/15 bg-black/50 p-6 backdrop-blur-md transition-colors scroll-mt-24 hover:border-[#e8702a]/50 hover:bg-black/60 ${
                visible ? "hero-anim hero-fade" : "opacity-0"
              }`}
              style={visible ? { animationDelay: `${0.15 + i * 0.1}s` } : undefined}
            >
              <div className="w-10 h-10 rounded-full bg-[#e8702a]/20 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-[#e8702a]" />
              </div>
              <h3 className="text-white text-base font-semibold mb-2">{title}</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                {id === "contact" ? (
                  <>
                    {description}{" "}
                    <a
                      href="mailto:info@lincolnnavigation.com"
                      className="text-[#e8702a] hover:underline"
                    >
                      info@lincolnnavigation.com
                    </a>
                  </>
                ) : (
                  description
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
