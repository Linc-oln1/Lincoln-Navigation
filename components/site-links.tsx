import Link from "next/link"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const

/** Small Contact · Privacy · Terms row for pages that have no footer. */
export function SiteLinks({
  exclude,
  className,
}: {
  exclude?: (typeof LINKS)[number]["href"]
  className?: string
}) {
  return (
    <nav
      aria-label="Site links"
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {LINKS.filter((l) => l.href !== exclude).map((l) => (
        <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

/** "By continuing you agree to our Terms and Privacy Policy." */
export function AgreeLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      By continuing you agree to our{" "}
      <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
        Privacy Policy
      </Link>
      .
    </p>
  )
}
