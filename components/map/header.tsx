"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Navigation, Layers, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "@/hooks/use-session"
import { useI18n } from "@/components/i18n/language-provider"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { StopNavigationDialog } from "@/components/map/stop-navigation-dialog"

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
  const { t } = useI18n()
  const [confirmOpen, setConfirmOpen] = useState(false)


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
              aria-label={t("map.exit")}
              title={t("map.exit")}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
              <span className="hidden sm:inline">{t("map.exitShort")}</span>
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
              <span className="text-sm">{t("map.search")}</span>
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
                title={t("dir.get")}
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
                title={t("nav.explore")}
              >
                <Layers className="w-5 h-5" />
              </button>

              <div className="hidden sm:block">
                <LanguageSwitcher
                  buttonClass="p-2.5 rounded-xl hover:bg-secondary text-foreground"
                  menuClass="border-border bg-card text-foreground"
                />
              </div>

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
                    title={t("nav.signIn")}
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

    <StopNavigationDialog
      open={confirmOpen}
      description={t("stop.exitDesc")}
      stopLabel={t("stop.exit")}
      onKeep={() => setConfirmOpen(false)}
      onStop={leave}
    />
    </>
  )
}
