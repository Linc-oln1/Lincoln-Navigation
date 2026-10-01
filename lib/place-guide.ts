// Helpers shared by /places and /places/[id].

import { GHANA_DESTINATIONS, type GhanaDestination } from "@/lib/ghana-destinations"
import { FEATURES_EN } from "@/lib/i18n/features-messages"

type FeatureKey = keyof typeof FEATURES_EN

export const regionName = (d: GhanaDestination) => FEATURES_EN[`ft.region.${d.region}` as FeatureKey]
export const categoryName = (d: GhanaDestination) => FEATURES_EN[`ft.cat.${d.category}` as FeatureKey]
export const blurb = (d: GhanaDestination) => FEATURES_EN[`ft.blurb.${d.id}` as FeatureKey]

export const findDestination = (id: string) => GHANA_DESTINATIONS.find((d) => d.id === id)

/** Straight-line distance in km. */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/** The other destinations, closest first. */
export function nearestTo(d: GhanaDestination, count: number) {
  return GHANA_DESTINATIONS.filter((o) => o.id !== d.id)
    .map((o) => ({ place: o, km: kmBetween(d, o) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count)
}

/** /app link that drops a pin on the destination (same as /features). */
export function directionsHref(d: GhanaDestination): string {
  const params = new URLSearchParams({ lat: `${d.lat}`, lng: `${d.lng}`, name: d.name })
  return `/app?${params.toString()}`
}
