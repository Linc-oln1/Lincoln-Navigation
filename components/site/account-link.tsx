"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useI18n } from "@/components/i18n/language-provider"
import { useSession } from "@/hooks/use-session"
import { cn } from "@/lib/utils"

/**
 * The one sign-in control every page shares: "Sign in" when signed out (and
 * sending people back to the page they were on afterwards), and an account
 * button with their initial when signed in. Renders nothing while accounts
 * aren't configured, and holds its space while the session loads so the
 * header doesn't jump.
 */
export function AccountLink({
  className,
  onNavigate,
  compact = false,
  fullWidth = false,
}: {
  /** Classes for the signed-out "Sign in" pill. */
  className?: string
  onNavigate?: () => void
  /** Icon-only when signed in (for tight headers). */
  compact?: boolean
  /** Stretch across the row (mobile menus). */
  fullWidth?: boolean
}) {
  const { t } = useI18n()
  const { user, loading, authEnabled } = useSession()
  const pathname = usePathname()

  if (!authEnabled) return null

  if (loading) {
    return (
      <span aria-hidden className={cn("invisible inline-block", className)}>
        {t("nav.signIn")}
      </span>
    )
  }

  if (user) {
    const initial = (user.email ?? "?").charAt(0).toUpperCase()
    return (
      <Link
        href="/account"
        onClick={onNavigate}
        title={user.email ?? t("nav.myAccount")}
        aria-label={t("nav.myAccount")}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-current/20 py-1 pl-1 pr-3 text-sm font-semibold transition hover:brightness-110",
          compact && "pr-1",
          fullWidth && "w-full justify-center py-2"
        )}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/25 text-xs font-bold text-primary">
          {initial}
        </span>
        {!compact && <span>{t("nav.myAccount")}</span>}
      </Link>
    )
  }

  // After signing in, come back to this page (the landing page goes to the map).
  const next = pathname && pathname !== "/" && !pathname.startsWith("/login") ? pathname : "/app"
  return (
    <Link href={`/login?next=${encodeURIComponent(next)}`} onClick={onNavigate} className={className}>
      {t("nav.signIn")}
    </Link>
  )
}
