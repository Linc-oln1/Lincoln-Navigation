import Link from "next/link"
import type { ReactNode } from "react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { LEGAL_DOCS } from "@/lib/legal"

/**
 * Shared shell for every legal document: header, title, "last updated"
 * line, the document body, and a strip linking to the other documents.
 */
export function LegalPage({
  title,
  updated,
  intro,
  path,
  children,
}: {
  title: string
  updated: string
  intro: ReactNode
  path: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <header className="mb-10 mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Legal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-xs text-muted-foreground">Last updated {updated}</p>
          <div className="mt-4 text-muted-foreground">{intro}</div>
        </header>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p+p]:mt-3 [&_strong]:text-foreground [&_table]:mt-3 [&_table]:w-full [&_table]:text-left [&_td]:border-t [&_td]:border-border [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-3 [&_th]:font-semibold [&_th]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>

        <nav aria-label="Legal documents" className="mt-16 rounded-2xl border border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            All legal documents
          </p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {LEGAL_DOCS.map((d) => (
              <li key={d.href}>
                {d.href === path ? (
                  <span className="font-semibold text-foreground">{d.title}</span>
                ) : (
                  <Link
                    href={d.href}
                    className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {d.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <SiteFooter />
    </main>
  )
}

/** A table wrapper that scrolls sideways on phones instead of the page. */
export function LegalTable({ children }: { children: ReactNode }) {
  return <div className="-mx-1 overflow-x-auto px-1">{children}</div>
}
