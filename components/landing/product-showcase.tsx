"use client"

import { useEffect, useRef, useState } from "react"
import { Compass, Search, CloudSun, Route, MousePointerClick } from "lucide-react"
import { HeroGlobe } from "@/components/landing/hero-globe"

/**
 * A scroll-triggered "product tour" section for the landing page:
 * a floating tablet mockup of the app's own interface (the real
 * HeroGlobe, not a new design), tilted in 3D and leveling out as
 * the section scrolls into view, surrounded by floating glass
 * feature cards (weather, a live-route chart, an interactive-UI
 * hint) with the site's existing blue/neon-cyan accent — no video,
 * no external asset, just DOM/CSS/SVG like the rest of the page.
 */
export function ProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  // one-time reveal, triggered once the section is meaningfully
  // in view (staggered fade/slide for copy, tablet, and cards)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // continuous scroll-linked "camera pan": the tablet starts
  // tilted away in 3D and levels out as the section crosses the
  // viewport. Mutates the ref's style directly (no React state)
  // so this stays smooth on every scroll tick.
  useEffect(() => {
    const section = sectionRef.current
    const tilt = tiltRef.current
    if (!section || !tilt) return

    let ticking = false

    const update = () => {
      ticking = false
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const raw = (vh - rect.top) / (vh + rect.height)
      const progress = Math.min(1, Math.max(0, raw))

      const rotateY = -16 + progress * 16
      const rotateX = 7 - progress * 7
      const translateY = (1 - progress) * 36

      tilt.style.transform = `perspective(1400px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) translateY(${translateY}px)`
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return (
    <section ref={sectionRef} className="showcase">
      <div className="showcase-glow showcase-glow-a" />
      <div className="showcase-glow showcase-glow-b" />
      <div className="showcase-grid" />

      <div className={`showcase-copy ${visible ? "is-visible" : ""}`}>
        <span className="showcase-eyebrow">Product tour</span>
        <h2 className="showcase-heading">
          Built like software you&apos;d actually want to use.
        </h2>
        <p className="showcase-sub">
          Live weather, mapped routes, and a globe that actually rotates —
          all in a dark, glass interface designed around Ghana&apos;s roads.
        </p>
      </div>

      <div className="showcase-stage">
        <div
          ref={tiltRef}
          className={`showcase-tilt ${visible ? "is-visible" : ""}`}
        >
          <div className="showcase-tablet">
            <div className="showcase-tablet-cam" />
            <div className="showcase-screen">
              <div className="showcase-screen-nav">
                <span className="showcase-screen-logo">
                  <Compass className="w-2.5 h-2.5 text-white" />
                </span>
                Lincoln Navigation
              </div>

              <div className="showcase-screen-globe">
                <HeroGlobe size={130} />
              </div>

              <div className="showcase-screen-pill">
                <Search className="w-2.5 h-2.5" />
                Where to...
              </div>

              <div className="showcase-screen-chart" aria-hidden="true">
                <svg viewBox="0 0 200 40" preserveAspectRatio="none">
                  <path
                    d="M0 30 L20 22 L40 26 L60 12 L80 18 L100 8 L120 16 L140 6 L160 14 L180 4 L200 10"
                    fill="none"
                    stroke="#4dd8ff"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
            <div className="showcase-tablet-sheen" />
          </div>

          <div className="showcase-card showcase-card-weather">
            <CloudSun className="w-4 h-4 text-[#4dd8ff] flex-shrink-0" />
            <div>
              <p className="showcase-card-label">Accra</p>
              <p className="showcase-card-value">28°C · Clear</p>
            </div>
          </div>

          <div className="showcase-card showcase-card-route">
            <Route className="w-4 h-4 text-[#4dd8ff] flex-shrink-0" />
            <div>
              <p className="showcase-card-label">Live route</p>
              <p className="showcase-card-value">ETA 24 min</p>
            </div>
            <svg className="showcase-card-spark" viewBox="0 0 60 20" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 16 L10 12 L20 14 L30 6 L40 10 L50 3 L60 7" fill="none" stroke="#4dd8ff" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="showcase-card showcase-card-hover">
            <MousePointerClick className="w-4 h-4 text-[#4dd8ff] flex-shrink-0" />
            <div>
              <p className="showcase-card-label">Interactive UI</p>
              <p className="showcase-card-value">Hover to explore</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
