"use client"

// components/ads/adsense-script.tsx
//
// The Google AdSense loader, exactly as AdSense's own snippet: a plain
// <script async> in the page <head>, so it's in the HTML Google's crawler
// fetches (AdSense's "code snippet" site verification looks for it there).
// Rendered from the root layout's <head>, only when a real publisher id is
// configured. Individual ad units are placed with <AdSlot>.
//
// Except on the live map (/app): there it competed with MapLibre for the
// phone's bandwidth and cost ~0.5–1 s before the map appeared, and the
// map's only ad sits in the Explore panel. <AdSlot> loads it there with
// ensureAdSenseScript() when the panel first shows an ad.

import { usePathname } from "next/navigation"
import { ADS_ENABLED, ADSENSE_CLIENT } from "@/lib/monetization"

const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`

const isMapPath = (path: string | null) => path === "/app" || Boolean(path?.startsWith("/app/"))

export function AdSenseScript() {
  const pathname = usePathname()
  if (!ADS_ENABLED || isMapPath(pathname)) return null

  return <script async src={ADSENSE_SRC} crossOrigin="anonymous" />
}

/** Adds the AdSense loader to the page if no earlier render did. */
export function ensureAdSenseScript() {
  if (!ADS_ENABLED || document.querySelector('script[src*="adsbygoogle.js"]')) return
  const s = document.createElement("script")
  s.async = true
  s.src = ADSENSE_SRC
  s.crossOrigin = "anonymous"
  document.head.appendChild(s)
}
