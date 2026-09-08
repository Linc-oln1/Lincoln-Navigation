"use client"

import { useEffect, useRef, useState } from "react"
import { Compass, CloudSun, Route, MousePointerClick } from "lucide-react"

/**
 * Scroll-triggered "product tour" section for the landing page: a
 * floating tablet mockup whose screen is an interactive world map
 * (the /public/showcase-worldmap.webp art) — the map parallaxes to
 * the cursor, a spotlight follows it, and glowing city nodes light
 * up on hover with routes flowing back to Accra. Surrounded by the
 * site's blue/neon-cyan glass feature cards. All DOM/CSS/SVG.
 */

interface City {
  id: string
  name: string
  /** % of the screen box */
  x: number
  y: number
  hub?: boolean
}

// Positions over /public/showcase-worldmap.webp, as % of the
// screen box (accounts for the 112% background zoom).
const CITIES: City[] = [
  { id: "accra", name: "Accra", hub: true, x: 50, y: 53.5 },
  { id: "london", name: "London", x: 46.5, y: 27 },
  { id: "newyork", name: "New York", x: 20, y: 33 },
  { id: "dubai", name: "Dubai", x: 62, y: 42 },
  { id: "joburg", name: "Johannesburg", x: 55.5, y: 77 },
  { id: "nairobi", name: "Nairobi", x: 58, y: 58 },
]

type CityId = string

const cityById = (id: CityId) => CITIES.find((c) => c.id === id)!

// Every spoke runs to the Accra hub.
const ROUTES = ["london", "newyork", "dubai", "joburg", "nairobi"]

export function ProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [activeCity, setActiveCity] = useState<CityId | null>(null)

  // one-time staggered reveal once the section is in view
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
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // scroll-linked "camera pan": the tablet starts tilted away and
  // levels out as the section crosses the viewport
  useEffect(() => {
    const section = sectionRef.current
    const tilt = tiltRef.current
    if (!section || !tilt) return

    let ticking = false
    const update = () => {
      ticking = false
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const progress = Math.min(
        1,
        Math.max(0, (vh - rect.top) / (vh + rect.height)),
      )
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

  // cursor parallax + spotlight on the map screen
  const handleScreenMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = screenRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const mx = (e.clientX - r.left) / r.width
    const my = (e.clientY - r.top) / r.height
    el.style.setProperty("--mx", mx.toFixed(3))
    el.style.setProperty("--my", my.toFixed(3))
  }

  const resetScreen = () => {
    const el = screenRef.current
    if (!el) return
    el.style.setProperty("--mx", "0.5")
    el.style.setProperty("--my", "0.5")
    setActiveCity(null)
  }

  // cursor parallax on the section's Earth-from-space background
  const handleSectionMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = sectionRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--sbx", ((e.clientX - r.left) / r.width).toFixed(3))
    el.style.setProperty("--sby", ((e.clientY - r.top) / r.height).toFixed(3))
  }

  const resetSection = () => {
    const el = sectionRef.current
    if (!el) return
    el.style.setProperty("--sbx", "0.5")
    el.style.setProperty("--sby", "0.5")
  }

  return (
    <section
      ref={sectionRef}
      className="showcase"
      style={{ ["--sbx" as string]: "0.5", ["--sby" as string]: "0.5" }}
      onMouseMove={handleSectionMove}
      onMouseLeave={resetSection}
    >
      <div className="showcase-bg" aria-hidden="true" />

      <div className={`showcase-copy ${visible ? "is-visible" : ""}`}>
        <span className="showcase-eyebrow">Product tour</span>
        <h2 className="showcase-heading">
          Built like software you&apos;d actually want to use.
        </h2>
        <p className="showcase-sub">
          Live weather, mapped routes, and a world that lights up as you
          explore it — all in a dark, glass interface designed around
          Ghana&apos;s roads.
        </p>
      </div>

      <div className="showcase-stage">
        <div
          ref={tiltRef}
          className={`showcase-tilt ${visible ? "is-visible" : ""}`}
        >
          <div className="showcase-tablet">
            <div className="showcase-tablet-cam" />

            <div
              ref={screenRef}
              className="showcase-screen showcase-screen--map"
              style={{ ["--mx" as string]: "0.5", ["--my" as string]: "0.5" }}
              onMouseMove={handleScreenMove}
              onMouseLeave={resetScreen}
            >
              <div className="showcase-map-img" aria-hidden="true" />
              <div className="showcase-map-spotlight" aria-hidden="true" />

              <div className="showcase-screen-nav">
                <span className="showcase-screen-logo">
                  <Compass className="w-2.5 h-2.5 text-white" />
                </span>
                Lincoln Navigation
              </div>

              {/* route spokes to Accra */}
              <svg
                className="showcase-map-routes"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {ROUTES.map((id) => {
                  const a = cityById("accra")
                  const b = cityById(id)
                  const mx = (a.x + b.x) / 2
                  const my = Math.min(a.y, b.y) - 12
                  const on = activeCity === id
                  return (
                    <path
                      key={id}
                      className={`showcase-route ${on ? "is-active" : ""}`}
                      d={`M ${b.x} ${b.y} Q ${mx} ${my} ${a.x} ${a.y}`}
                    />
                  )
                })}
              </svg>

              {/* city nodes */}
              {CITIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`showcase-node ${c.hub ? "is-hub" : ""} ${
                    activeCity === c.id ? "is-active" : ""
                  }`}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  onMouseEnter={() => !c.hub && setActiveCity(c.id)}
                  onFocus={() => !c.hub && setActiveCity(c.id)}
                  aria-label={c.name}
                >
                  <span className="showcase-node-dot" />
                  <span className="showcase-node-label">{c.name}</span>
                </button>
              ))}
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
            <svg
              className="showcase-card-spark"
              viewBox="0 0 60 20"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M0 16 L10 12 L20 14 L30 6 L40 10 L50 3 L60 7"
                fill="none"
                stroke="#4dd8ff"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          <div className="showcase-card showcase-card-hover">
            <MousePointerClick className="w-4 h-4 text-[#4dd8ff] flex-shrink-0" />
            <div>
              <p className="showcase-card-label">Interactive UI</p>
              <p className="showcase-card-value">Hover the map</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
