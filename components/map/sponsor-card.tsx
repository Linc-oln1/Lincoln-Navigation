"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import {
  loadLiveSponsors,
  nearestSponsor,
  trackSponsor,
  trackSponsorViewOnce,
  type SponsoredPlace,
} from "@/lib/sponsored-places"

const DISMISS_KEY = "ln_sponsor_card_dismissed"

interface SponsorCardProps {
  /** Hide while another panel, place card or navigation owns the screen. */
  hidden: boolean
  userLocation: [number, number] | null
  mapCenter: [number, number]
  onSelect: (place: SponsoredPlace & { sponsored: true; type: string }) => void
}

/**
 * Small "Sponsored" card on the main map screen: the nearest paying sponsor
 * (any category) whose radius covers the visitor or the map view. Clearly
 * labelled, dismissible for the session, and counted as one view per page load.
 */
export function SponsorCard({ hidden, userLocation, mapCenter, onSelect }: SponsorCardProps) {
  const { t } = useI18n()
  const [sponsors, setSponsors] = useState<SponsoredPlace[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true)
    } catch {}
    loadLiveSponsors().then(setSponsors)
  }, [])

  const sponsor = hidden || dismissed ? null : nearestSponsor(sponsors, [userLocation, mapCenter])

  useEffect(() => {
    if (sponsor) trackSponsorViewOnce(sponsor.id)
  }, [sponsor])

  if (!sponsor) return null

  return (
    <div className="absolute left-4 bottom-48 md:bottom-28 z-[1000] w-[calc(100vw-2rem)] max-w-[300px]">
      <div className="relative flex items-start gap-2 rounded-xl border border-primary/30 bg-card/95 backdrop-blur-sm shadow-lg">
        <button
          onClick={() => {
            trackSponsor(sponsor.id, "click")
            onSelect({ ...sponsor, sponsored: true, type: sponsor.category })
          }}
          className="flex-1 min-w-0 p-3 pr-8 text-left"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/40 rounded px-1 py-0.5">
            {t("places.sponsored")}
          </span>
          <p className="mt-1 font-medium text-foreground truncate">{sponsor.name}</p>
          <p className="text-xs text-muted-foreground truncate">{sponsor.tagline ?? sponsor.address}</p>
        </button>
        <button
          onClick={() => {
            setDismissed(true)
            try {
              sessionStorage.setItem(DISMISS_KEY, "1")
            } catch {}
          }}
          className="absolute right-1 top-1 p-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
