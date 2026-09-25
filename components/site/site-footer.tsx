import Link from "next/link"
import { cn } from "@/lib/utils"
import { FOOTER_GROUPS } from "@/lib/site-nav"
import { SITE_THEME, type SiteVariant } from "@/components/site/site-theme"

/** Shared footer: every public page, grouped by purpose. */
export function SiteFooter({ variant = "app" }: { variant?: SiteVariant }) {
  const t = SITE_THEME[variant]

  return (
    <footer className={cn("relative z-10 border-t", t.bar, t.border)}>
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", t.muted)}>
                {group.title}
              </p>
              <ul className="mt-3 space-y-2">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={cn("text-sm transition-colors", t.text, "opacity-80 hover:opacity-100")}
                    >
                      {l.label}
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
          <span>Maps and navigation for Ghana</span>
        </div>
      </div>
    </footer>
  )
}
