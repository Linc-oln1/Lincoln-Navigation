"use client"

import { ExternalLink } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import { anyAffiliate, bookLinks, type TravelKind } from "@/lib/travel-partners"

/**
 * "Book on <partner>" buttons for a place or a general search. The partner's
 * site handles the booking and payment; links that carry our affiliate id
 * are marked rel="sponsored" and come with a plain-language disclosure.
 */
export function BookLinks({ kind, query, heading }: { kind: TravelKind; query: string; heading?: string }) {
  const { t } = useI18n()
  const links = bookLinks(kind, query)
  if (links.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      {heading && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>}
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel={l.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
          >
            {t("travel.bookOn", { partner: l.partner })}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t("travel.partnerNote")}
        {anyAffiliate(links) && ` ${t("travel.disclosure")}`}
      </p>
    </div>
  )
}
