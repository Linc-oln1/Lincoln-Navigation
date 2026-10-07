// lib/sponsored-places.ts
//
// Paid placements for the "Explore Nearby" panel. A sponsored
// place is pinned to the top of its category's results (clearly
// labelled "Sponsored") whenever the map is centred within
// `radiusKm` of it.
//
// Sponsors live in Supabase (0007_sponsors.sql) and are managed at
// /admin/sponsors; the app fetches the live ones from /api/sponsored.
// Only businesses that have actually paid are ever listed — the app
// never shows fabricated businesses. See docs/MONETIZATION.md.

import type { Place } from "@/lib/geocoding"

/** A live sponsor as served by /api/sponsored (public fields only). */
export interface SponsoredPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  /** places-panel category id, e.g. "restaurant", "hotel", "fuel". */
  category: string
  /** One-line promo shown under the name. Keep it honest. */
  tagline?: string
  /** Optional outbound link (menu, booking, website). */
  url?: string
  /** Show this sponsor when the map centre is within this many km. */
  radiusKm: number
}

/**
 * Categories a business can sponsor. Ids MUST match the ones in
 * components/map/places-panel CATEGORIES so listings slot into the
 * right results. (Transport hubs like airports are left out.)
 */
export const SPONSOR_CATEGORIES: { id: string; label: string }[] = [
  { id: "restaurant", label: "Restaurants" },
  { id: "cafe", label: "Cafes" },
  { id: "shop", label: "Shopping" },
  { id: "supermarket", label: "Supermarkets" },
  { id: "bank", label: "Banks" },
  { id: "fuel", label: "Gas stations" },
  { id: "hotel", label: "Hotels" },
  { id: "tourism", label: "Attractions" },
  { id: "hospital", label: "Hospitals" },
  { id: "pharmacy", label: "Pharmacies" },
  { id: "parking", label: "Parking" },
  { id: "cinema", label: "Cinemas" },
  { id: "gym", label: "Gyms" },
  { id: "tour", label: "Tours & travel agents" },
  { id: "car_rental", label: "Car rentals" },
  { id: "event_venue", label: "Event venues" },
]

export function sponsorCategoryLabel(id: string): string {
  return SPONSOR_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

const EARTH_RADIUS_KM = 6371

export function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * Sponsored places to pin at the top of `category` results, given
 * the live sponsors and the current map centre ([lat, lng]). Returns
 * [] when there are no in-range sponsors — the common case.
 */
export function getSponsoredPlaces(
  sponsors: SponsoredPlace[],
  category: string,
  mapCenter: [number, number],
): (Place & { sponsored: true; tagline?: string; url?: string })[] {
  return sponsors
    .filter((s) => s.category === category)
    .filter((s) => distanceKm(mapCenter, [s.lat, s.lng]) <= s.radiusKm)
    .map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      type: s.category,
      sponsored: true as const,
      tagline: s.tagline,
      url: s.url,
    }))
}

/** Where to send view/click counts. Fire-and-forget; never throws. */
export function trackSponsor(id: string, kind: "impression" | "click" | "website") {
  try {
    const body = JSON.stringify({ id, kind })
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/sponsored/track", new Blob([body], { type: "application/json" }))
    } else {
      void fetch("/api/sponsored/track", { method: "POST", body, keepalive: true }).catch(() => {})
    }
  } catch {
    /* tracking must never break the map */
  }
}

// Live sponsors, fetched once per page load and shared by every surface
// (Explore panel, map-screen card).
let sponsorsRequest: Promise<SponsoredPlace[]> | null = null
export function loadLiveSponsors(): Promise<SponsoredPlace[]> {
  sponsorsRequest ??= fetch("/api/sponsored")
    .then((r) => (r.ok ? r.json() : { sponsors: [] }))
    .then((d: { sponsors?: SponsoredPlace[] }) => d.sponsors ?? [])
    .catch(() => [])
  return sponsorsRequest
}

// One view per sponsor per page load, however many surfaces show it.
const sponsorsSeen = new Set<string>()
export function trackSponsorViewOnce(id: string) {
  if (sponsorsSeen.has(id)) return
  sponsorsSeen.add(id)
  trackSponsor(id, "impression")
}

/**
 * The nearest live sponsor (any category) whose radius covers one of the
 * given points: the visitor's location and/or the map centre.
 */
export function nearestSponsor(
  sponsors: SponsoredPlace[],
  points: ([number, number] | null | undefined)[],
): SponsoredPlace | null {
  let best: SponsoredPlace | null = null
  let bestKm = Infinity
  for (const s of sponsors) {
    for (const p of points) {
      if (!p) continue
      const km = distanceKm(p, [s.lat, s.lng])
      if (km <= s.radiusKm && km < bestKm) {
        best = s
        bestKm = km
      }
    }
  }
  return best
}
