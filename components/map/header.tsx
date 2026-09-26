"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Navigation, Layers, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "@/hooks/use-session"

interface HeaderProps {
  onSearchClick: () => void
  onDirectionsClick: () => void
  onPlacesClick: () => void
  activePanel: "search" | "directions" | "places" | "saved" | null
  /** Live navigation is running — Exit asks for confirmation first. */
  isNavigating?: boolean
}

export function Header({ onSearchClick, onDirectionsClick, onPlacesClick, activePanel, isNavigating = false }: HeaderProps) {
  const { user, authEnabled } = useSession()
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!confirmOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [confirmOpen])

  // If navigation ends while the prompt is up, there's nothing to confirm.
  useEffect(() => {
    if (!isNavigating) setConfirmOpen(false)
  }, [isNavigating])

  // Back to the previous page of this site; if the map was opened
  // directly or from another website, go to the home page instead.
  // The Navigation API only counts same-site entries; browsers without
  // it fall back to a same-site referrer check.
  const leave = () => {
    const nav = (window as unknown as { navigation?: { canGoBack: boolean } })
      .navigation
    let cameFromSite = false
    if (nav) {
      cameFromSite = nav.canGoBack
    } else if (document.referrer) {
      try {
        cameFromSite = new URL(document.referrer).origin === window.location.origin
      } catch {}
    }
    if (cameFromSite) router.back()
    else router.push("/")
  }

  const handleExit = () => {
    if (isNavigating) setConfirmOpen(true)
    else leave()
  }

  return (
    <>
    <header className="absolute top-0 left-0 right-0 z-[1000] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo & Search Bar */}
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-3">
            {/* Exit — back to the previous page */}
            <button
              type="button"
              onClick={handleExit}
              aria-label="Exit map"
              title="Exit map"
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Exit</span>
            </button>

            {/* Logo */}
            <div className="hidden items-center px-2 sm:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/lincoln-navigation-logo.webp"
                alt="Lincoln Navigation"
                className="h-8 sm:h-9 w-auto"
              />
            </div>

            {/* Search Button */}
            <button
              onClick={onSearchClick}
              className={cn(
                "flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-left",
                activePanel === "search"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
              )}
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search anywhere...</span>
            </button>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={onDirectionsClick}
                className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  activePanel === "directions"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground"
                )}
                title="Get directions"
              >
                <Navigation className="w-5 h-5" />
              </button>
              <button
                onClick={onPlacesClick}
                className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  activePanel === "places"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground"
                )}
                title="Explore places"
              >
                <Layers className="w-5 h-5" />
              </button>

              {authEnabled &&
                (user ? (
                  <Link
                    href="/account"
                    title={user.email ?? "Account"}
                    className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold uppercase hover:bg-primary/30 transition-colors"
                  >
                    {(user.email ?? "?").charAt(0)}
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    title="Sign in"
                    className="p-2.5 rounded-xl hover:bg-secondary text-foreground transition-colors"
                  >
                    <User className="w-5 h-5" />
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </header>

    {confirmOpen && (
      <div
        className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4"
        onClick={() => setConfirmOpen(false)}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="exit-nav-title"
          aria-describedby="exit-nav-desc"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        >
          <h2 id="exit-nav-title" className="text-lg font-semibold text-foreground">
            Stop navigation?
          </h2>
          <p id="exit-nav-desc" className="mt-2 text-sm text-muted-foreground">
            You&apos;re in the middle of a trip. Leaving the map will end live
            navigation and turn off voice guidance.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={leave}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary active:scale-95"
            >
              Stop &amp; exit
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmOpen(false)}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:scale-95"
            >
              Keep navigating
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
