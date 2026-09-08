"use client"

// components/ads/ad-slot.tsx
//
// A single responsive AdSense unit. Renders:
//   - nothing            → for premium visitors (ad-free)
//   - a dev placeholder  → locally / before AdSense is configured
//   - a real ad unit     → in production once configured
//
// Usage:  <AdSlot name="landingInline" />

import { useEffect, useRef } from "react"
import { AD_SLOTS, ADS_ENABLED, ADSENSE_CLIENT, type AdSlotName } from "@/lib/monetization"
import { usePremium } from "@/hooks/use-premium"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

interface AdSlotProps {
  name: AdSlotName
  /** Extra classes for the wrapper (e.g. max-width, margins). */
  className?: string
  /** Label shown above the unit. Defaults to "Advertisement". */
  label?: string
}

export function AdSlot({ name, className, label = "Advertisement" }: AdSlotProps) {
  const slotId = AD_SLOTS[name]
  const { isPremium } = usePremium()
  const pushed = useRef(false)

  useEffect(() => {
    if (!ADS_ENABLED || !slotId || isPremium || pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch {
      /* AdSense not ready yet — it retries its own queue. */
    }
  }, [slotId, isPremium])

  // Premium visitors never see ads.
  if (isPremium) return null

  // Not configured yet. AdSense is deferred, so by default this
  // renders nothing anywhere. Set NEXT_PUBLIC_ADS_DEBUG=1 to show a
  // placeholder box in dev while working on ad placement.
  if (!ADS_ENABLED || !slotId) {
    if (process.env.NEXT_PUBLIC_ADS_DEBUG !== "1") return null
    return (
      <div
        className={cn(
          "mx-auto flex min-h-[100px] w-full max-w-[728px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-xs text-muted-foreground",
          className,
        )}
      >
        Ad slot &ldquo;{name}&rdquo; — set NEXT_PUBLIC_ADSENSE_CLIENT + slot id
      </div>
    )
  }

  return (
    <div className={cn("mx-auto w-full max-w-[728px] text-center", className)}>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
