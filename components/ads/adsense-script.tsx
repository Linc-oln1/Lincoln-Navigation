// components/ads/adsense-script.tsx
//
// The Google AdSense loader, exactly as AdSense's own snippet: a plain
// <script async> in the page <head>, so it's in the HTML Google's crawler
// fetches (AdSense's "code snippet" site verification looks for it there).
// Rendered from the root layout's <head>, only when a real publisher id is
// configured. Individual ad units are placed with <AdSlot>.

import { ADS_ENABLED, ADSENSE_CLIENT } from "@/lib/monetization"

export function AdSenseScript() {
  if (!ADS_ENABLED) return null

  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  )
}
