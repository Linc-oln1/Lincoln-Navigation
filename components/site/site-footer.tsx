"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { FOOTER_GROUPS } from "@/lib/site-nav"
import { useI18n } from "@/components/i18n/language-provider"
import { SITE_THEME, type SiteVariant } from "@/components/site/site-theme"

/** Shared footer: every public page, grouped by purpose. */
export function SiteFooter({ variant = "app" }: { variant?: SiteVariant }) {
  const t = SITE_THEME[variant]
  const { t: tr } = useI18n()

  return (
    <footer className={cn("relative z-10 border-t", t.bar, t.border)}>
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.titleKey} aria-label={tr(group.titleKey)}>
              <p className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", t.muted)}>
                {tr(group.titleKey)}
              </p>
              <ul className="mt-3 space-y-2">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={cn("text-sm transition-colors", t.text, "opacity-80 hover:opacity-100")}
                    >
                      {tr(l.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div
          className={cn(
            "mt-10 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between",
            t.border,
            t.muted,
          )}
        >
          <span>© {new Date().getFullYear()} LincolnNavigation.com</span>
          <span>{tr("footer.tagline")}</span>
        </div>
      </div>
    </footer>
  )
}
