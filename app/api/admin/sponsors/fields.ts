// Shared validation for the admin sponsor routes.

import { sponsorPackage } from "@/lib/monetization"
import { SPONSOR_CATEGORIES } from "@/lib/sponsored-places"

export interface SponsorFields {
  name?: string
  address?: string
  lat?: number
  lng?: number
  category?: string
  tagline?: string | null
  url?: string | null
  package?: "local" | "citywide" | "custom"
  radius_km?: number
  ends_at?: string | null
  contact_name?: string | null
  contact_email?: string
  contact_phone?: string | null
  notes?: string | null
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined)

/**
 * Picks the editable sponsor fields out of a request body. With
 * requireAll (creating), the listing basics must all be present; when
 * editing, only the fields sent are checked and changed.
 */
export function parseSponsorFields(
  body: Record<string, unknown>,
  { requireAll }: { requireAll: boolean },
): { fields: SponsorFields } | { error: string } {
  const f: SponsorFields = {}
  const has = (k: string) => requireAll || k in body

  if (has("name")) {
    const v = str(body.name, 80)
    if (!v || v.length < 2) return { error: "Enter the business name." }
    f.name = v
  }
  if (has("address")) {
    const v = str(body.address, 200)
    if (!v) return { error: "Enter the address." }
    f.address = v
  }
  if (has("lat") || has("lng")) {
    const lat = Number(body.lat)
    const lng = Number(body.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return { error: "Latitude and longitude must be valid numbers." }
    }
    f.lat = lat
    f.lng = lng
  }
  if (has("category")) {
    const v = str(body.category, 40)
    if (!v || !SPONSOR_CATEGORIES.some((c) => c.id === v)) return { error: "Choose a category." }
    f.category = v
  }
  if (has("package")) {
    const v = str(body.package, 20)
    if (v !== "custom" && !sponsorPackage(v ?? "")) return { error: "Choose a package." }
    f.package = v as SponsorFields["package"]
    if (v !== "custom" && !("radius_km" in body)) f.radius_km = sponsorPackage(v!)!.radiusKm
  }
  if ("radius_km" in body || (requireAll && f.radius_km === undefined)) {
    const v = Number(body.radius_km)
    if (!Number.isFinite(v) || v <= 0 || v > 200) return { error: "Radius must be between 0 and 200 km." }
    f.radius_km = v
  }
  if ("tagline" in body) f.tagline = str(body.tagline, 90) || null
  if ("url" in body) {
    const v = str(body.url, 300)
    if (v && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(v)) return { error: "The website should start with http:// or https://" }
    f.url = v || null
  }
  if ("ends_at" in body) {
    const v = str(body.ends_at, 40)
    if (v && !Number.isFinite(Date.parse(v))) return { error: "End date isn't a valid date." }
    f.ends_at = v ? new Date(v).toISOString() : null
  }
  if (has("contact_email")) {
    const v = str(body.contact_email, 200)?.toLowerCase()
    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { error: "Enter a valid contact email." }
    f.contact_email = v
  }
  if ("contact_name" in body) f.contact_name = str(body.contact_name, 80) || null
  if ("contact_phone" in body) f.contact_phone = str(body.contact_phone, 30) || null
  if ("notes" in body) f.notes = str(body.notes, 2000) || null

  return { fields: f }
}
