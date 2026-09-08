// lib/sponsored-places.ts
//
// Paid placements for the "Explore Nearby" panel. A sponsored
// place is pinned to the top of its category's results (clearly
// labelled "Sponsored") whenever the map is centred within
// `radiusKm` of it.
//
// This list is intentionally EMPTY until real advertisers sign up
// — the app never shows fabricated businesses. Add an entry only
// for a business that has actually paid. See docs/MONETIZATION.md
// and the /advertise page.
//
// To add a sponsor, append an object matching SponsoredPlace. The
// `category` MUST be one of the ids in components/map/places-panel
// CATEGORIES so it slots into the right results list.

import type { Place } from "@/lib/geocoding"

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
  /** Campaign window — entry is ignored outside it. ISO dates. */
  startsAt?: string
  endsAt?: string
}

export const SPONSORED_PLACES: SponsoredPlace[] = [
  {
    id: "sponsor-franchman-enterprise",
    name: "Franchman Enterprise",
    address: "Blofonyo Ln, Abossey Okai, Accra · GA-216-6164",
    // Geocoded from "Blofonyo Lane, Abossey Okai, Accra" — the
    // business itself isn't mapped in OpenStreetMap yet.
    lat: 5.5605857,
    lng: -0.231748,
    category: "shop",
    radiusKm: 8,
  },
]

const EARTH_RADIUS_KM = 6371

function distanceKm(a: [number, number], b: [number, number]): number {
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
 * the current map centre ([lat, lng]). Returns [] when there are
 * no active, in-range sponsors — the common case.
 */
export function getSponsoredPlaces(
  category: string,
  mapCenter: [number, number],
): (Place & { sponsored: true; tagline?: string; url?: string })[] {
  const now = Date.now()

  return SPONSORED_PLACES.filter((s) => s.category === category)
    .filter((s) => {
      if (s.startsAt && now < Date.parse(s.startsAt)) return false
      if (s.endsAt && now > Date.parse(s.endsAt)) return false
      return distanceKm(mapCenter, [s.lat, s.lng]) <= s.radiusKm
    })
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
