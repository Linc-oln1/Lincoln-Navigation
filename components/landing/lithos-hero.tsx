"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Compass, Menu, X } from "lucide-react"

interface LithosHeroProps {
  /* Called when a visitor chooses to move past the hero — there's no
     auto-advance here, so the parent decides what "continue" means. */
  onEnter?: () => void
}

const NAV_LINKS = ["Features", "Live Map", "About", "Contact"]

/* "Features", "About", and "Contact" all live in the mission section
   below — scroll-margin on their targets (see lithos-features.tsx)
   keeps the fixed nav from covering whatever they scroll to.
   "Contact" lands on the "We're listening" card, which carries the
   actual mailto: link. */
const NAV_SCROLL_TARGETS: Record<string, string> = {
  Features: "features",
  About: "about",
  Contact: "contact",
}

/**
 * Full-screen dark hero, built to spec: a video background that
 * autoplays/loops on its own at rest, and is additionally scrubbed
 * by scroll position while the hero is scrolling past (the cursor-
 * spotlight image reveal from the original brief is intentionally
 * not implemented — no base/reveal images, no canvas mask, no mouse
 * tracking) with no scrim/overlay on top of it, Playfair-italic
 * display type over an Inter UI face, and a floating glass nav pill.
 */
export function LithosHero({ onEnter }: LithosHeroProps) {
  const router = useRouter()
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const goToApp = () => router.push("/app")
  const scrollToId = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

  // Runs a nav action after closing the mobile menu, so the overlay
  // is gone before the page scrolls or navigates away.
  const handleMobileNavClick = (action?: () => void) => () => {
    setMenuOpen(false)
    action?.()
  }

  // On top of its own autoplay/loop, currentTime is also snapped
  // to how far the hero has scrolled past the top of the viewport
  // on every scroll event, so scrubbing the page scrubs the footage
  // (0 = section just starting to scroll away, 1 = fully scrolled
  // out of view); it keeps playing normally from wherever that
  // leaves it once scrolling stops.
  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video) return

    let ticking = false

    const update = () => {
      ticking = false
      if (!video.duration || Number.isNaN(video.duration)) return
      const rect = section.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, -rect.top / rect.height))
      video.currentTime = progress * video.duration
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    video.addEventListener("loadedmetadata", update)
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      video.removeEventListener("loadedmetadata", update)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return (
    <div className="lithos-root min-h-screen bg-white tracking-[-0.02em]">
      <section
        ref={sectionRef}
        className="relative w-full overflow-hidden h-screen bg-black"
        style={{ height: "100dvh" }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="/landing/video/hero-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />

        {/* Softens the hard cut into the features section below —
            only the bottom slice fades to that section's exact
            background color, so the video itself stays clean. */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #07080b)" }}
        />

        <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-white" aria-hidden="true" />
            <span className="text-white text-lg sm:text-2xl font-playfair italic whitespace-nowrap">
              Lincoln Navigation
            </span>
          </div>

          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
            <button type="button" className="px-4 py-1.5 rounded-full text-sm font-medium text-white">
              Explore
            </button>
            {NAV_LINKS.map((label) => {
              const targetId = NAV_SCROLL_TARGETS[label]
              const onClick = label === "Live Map" ? goToApp : targetId ? () => scrollToId(targetId) : undefined
              return (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goToApp}
              className="hidden md:block bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100"
            >
              Launch Map
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Menu"}
              aria-expanded={menuOpen}
              className="md:hidden w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu — the same five controls as the desktop nav
            pill + Launch Map button, since those are all `hidden`
            below md and the hamburger was otherwise the only mobile
            nav control (and did nothing on its own). */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-[90] bg-black/97 backdrop-blur-2xl flex flex-col items-center justify-center gap-3 hero-anim hero-fade">
            <button
              type="button"
              onClick={handleMobileNavClick()}
              className="text-[#e8702a] text-2xl font-medium py-3"
            >
              Explore
            </button>
            {NAV_LINKS.map((label) => {
              const targetId = NAV_SCROLL_TARGETS[label]
              const action = label === "Live Map" ? goToApp : targetId ? () => scrollToId(targetId) : undefined
              return (
                <button
                  key={label}
                  type="button"
                  onClick={handleMobileNavClick(action)}
                  className="text-white/90 text-2xl font-medium py-3 hover:text-white transition-colors"
                >
                  {label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={handleMobileNavClick(goToApp)}
              className="mt-6 bg-white text-gray-900 text-base font-semibold px-8 py-3.5 rounded-full hover:bg-gray-100"
            >
              Launch Map
            </button>
          </div>
        )}

        <div className="absolute top-[14%] left-0 right-0 z-50 flex flex-col items-center text-center px-5 pointer-events-none">
          <h1 className="text-white leading-[0.95]">
            <span
              className="hero-anim hero-reveal block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl"
              style={{ letterSpacing: "-0.05em", animationDelay: "0.25s" }}
            >
              Know the way
            </span>
            <span
              className="hero-anim hero-reveal block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1"
              style={{ letterSpacing: "-0.08em", animationDelay: "0.42s" }}
            >
              before you go
            </span>
          </h1>
        </div>

        <div
          className="hero-anim hero-fade hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50"
          style={{ animationDelay: "0.7s" }}
        >
          <p className="text-sm text-white/80 leading-relaxed">
            A clear path through every street, roundabout, and detour — built for how Ghana
            actually moves.
          </p>
        </div>

        <div
          className="hero-anim hero-fade absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 z-50"
          style={{ animationDelay: "0.85s" }}
        >
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Real-time routes and live positioning, whichever way you&apos;re headed.
          </p>
          <button
            type="button"
            onClick={onEnter}
            className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30"
          >
            Start Exploring
          </button>
        </div>
      </section>
    </div>
  )
}
