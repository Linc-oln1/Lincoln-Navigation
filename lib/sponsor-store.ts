// lib/sponsor-store.ts  (server only)
//
// Sponsors and their daily stats in Supabase (see 0007_sponsors.sql),
// through the service-role client. Used by /api/sponsored (public, live
// listings only), /api/sponsor/* (checkout) and /api/admin/sponsors.

import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import type { SponsoredPlace } from "@/lib/sponsored-places"

export type SponsorStatus =
  | "awaiting_payment"
  | "pending_review"
  | "active"
  | "paused"
  | "ended"
  | "rejected"

export interface SponsorRow {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
  tagline: string | null
  url: string | null
  package: "local" | "citywide" | "custom"
  radius_km: number
  status: SponsorStatus
  starts_at: string | null
  ends_at: string | null
  contact_name: string | null
  contact_email: string
  contact_phone: string | null
  paystack_reference: string | null
  amount_pesewas: number | null
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SponsorStats {
  impressions: number
  clicks: number
  website_clicks: number
}

/** Active sponsors whose campaign window includes now. Never throws. */
export async function listLiveSponsors(): Promise<SponsoredPlace[]> {
  if (!ADMIN_ENABLED) return []
  try {
    const now = Date.now()
    const { data, error } = await createAdminClient()
      .from("sponsors")
      .select("id, name, address, lat, lng, category, tagline, url, radius_km, starts_at, ends_at")
      .eq("status", "active")
    if (error) throw error
    const live = (data ?? []).filter(
      (s) =>
        (!s.starts_at || Date.parse(s.starts_at) <= now) &&
        (!s.ends_at || Date.parse(s.ends_at) > now),
    )
    return live.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      category: s.category,
      tagline: s.tagline ?? undefined,
      url: s.url ?? undefined,
      radiusKm: Number(s.radius_km),
    }))
  } catch (error) {
    console.error("[sponsors] could not list live sponsors:", error)
    return []
  }
}

/** True if `id` is a sponsor that is live right now (guards the tracker). */
export async function isLiveSponsor(id: string): Promise<boolean> {
  return (await listLiveSponsors()).some((s) => s.id === id)
}

export async function bumpSponsorStat(id: string, kind: "impression" | "click" | "website") {
  if (!ADMIN_ENABLED) return
  const { error } = await createAdminClient().rpc("bump_sponsor_stat", {
    p_sponsor: id,
    p_kind: kind,
  })
  if (error) console.error("[sponsors] could not record stat:", error.message)
}

/** Every sponsor, newest first, with lifetime and last-30-day totals. */
export async function listAllSponsorsWithStats(): Promise<
  (SponsorRow & { total: SponsorStats; last30: SponsorStats })[]
> {
  const db = createAdminClient()
  const [{ data: sponsors, error }, { data: stats, error: statsError }] = await Promise.all([
    db.from("sponsors").select("*").order("created_at", { ascending: false }),
    db.from("sponsor_daily_stats").select("sponsor_id, day, impressions, clicks, website_clicks"),
  ])
  if (error) throw error
  if (statsError) throw statsError

  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const zero = (): SponsorStats => ({ impressions: 0, clicks: 0, website_clicks: 0 })
  const totals = new Map<string, { total: SponsorStats; last30: SponsorStats }>()
  for (const s of stats ?? []) {
    const t = totals.get(s.sponsor_id) ?? { total: zero(), last30: zero() }
    for (const bucket of s.day >= cutoff ? [t.total, t.last30] : [t.total]) {
      bucket.impressions += s.impressions
      bucket.clicks += s.clicks
      bucket.website_clicks += s.website_clicks
    }
    totals.set(s.sponsor_id, t)
  }

  return (sponsors ?? []).map((s) => ({
    ...(s as SponsorRow),
    radius_km: Number(s.radius_km),
    ...(totals.get(s.id) ?? { total: zero(), last30: zero() }),
  }))
}
