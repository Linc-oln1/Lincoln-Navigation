"use client"

// components/ads/adsense-script.tsx
//
// Loads the Google AdSense loader script once, site-wide, but only
// when a real publisher id is configured. Rendered from the root
// layout. Individual ad units are placed with <AdSlot>.

import Script from "next/script"
import { ADS_ENABLED, ADSENSE_CLIENT } from "@/lib/monetization"

export function AdSenseScript() {
  if (!ADS_ENABLED) return null

  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  )
}
