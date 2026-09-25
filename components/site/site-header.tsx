"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { HEADER_LINKS } from "@/lib/site-nav"
import { SITE_THEME, type SiteVariant } from "@/components/site/site-theme"

/** Shared top bar for the public pages. */
export function SiteHeader({ variant = "app" }: { variant?: SiteVariant }) {
  const t = SITE_THEME[variant]
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const linkClass = (href: string) =>
    cn(
      "text-sm transition-colors",
      pathname === href ? t.active : cn(t.muted, t.hover),
    )

  return (
    <header className={cn("relative z-30 border-b", t.bar, t.border)}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link href="/" className={cn("flex items-center gap-2.5", t.text)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/lincoln-navigation-logo.webp"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 rounded-md object-contain"
          />
          <span className="text-sm font-bold tracking-tight">LincolnNavigation</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {HEADER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition hover:brightness-110",
              t.pill,
            )}
          >
            Sign in
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn("rounded-md p-2 md:hidden", t.text)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Mobile"
          className={cn(
            "absolute inset-x-0 top-full flex flex-col gap-1 border-b px-5 pb-4 pt-2 md:hidden",
            t.menu,
          )}
        >
          {HEADER_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn("rounded-md py-2.5 text-base", linkClass(l.href))}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className={cn(
              "mt-2 rounded-full px-4 py-2.5 text-center text-base font-semibold",
              t.pill,
            )}
          >
            Sign in
          </Link>
        </nav>
      )}
    </header>
  )
}
