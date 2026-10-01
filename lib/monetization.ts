// lib/monetization.ts
//
// Single source of truth for how LincolnNavigation.com earns money.
// Everything here is driven by environment variables so the repo
// stays free of account IDs / secret keys. Nothing turns on until
// the matching env var is set — see docs/MONETIZATION.md for setup.
//
// Three revenue streams:
//   1. Display ads       — Google AdSense units on public pages.
//   2. Sponsored places  — local businesses pay to be pinned in
//                           "Explore Nearby" results (see
//                           lib/sponsored-places.ts).
//   3. Premium / Pro      — paid tiers billed via Paystack. Premium is
//                           live (dormant until keys are set); Pro is
//                           display-only and routes to the business
//                           enquiry form until its tools exist.

/* ----------------------------- ads ----------------------------- */

/** AdSense publisher id, e.g. "ca-pub-1234567890123456". */
export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || ""

/** True once a real publisher id is configured. */
export const ADS_ENABLED = ADSENSE_CLIENT.startsWith("ca-pub-")

/**
 * Named ad slots. Fill in the numeric slot ids AdSense gives you
 * for each unit you create. A slot with an empty id renders
 * nothing (the <AdSlot> falls back to a dev placeholder locally).
 */
export const AD_SLOTS = {
  landingInline: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LANDING?.trim() || "",
  placesFooter: process.env.NEXT_PUBLIC_ADSENSE_SLOT_PLACES?.trim() || "",
} as const

export type AdSlotName = keyof typeof AD_SLOTS

/* -------------------------- premium --------------------------- */

/** Publishable Paystack key (safe for the browser). */
export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim() || ""

/** True once Paystack is wired up (secret key lives server-side only). */
export const PREMIUM_ENABLED = PAYSTACK_PUBLIC_KEY.startsWith("pk_")

/** Price of the premium plan, in the smallest currency unit (pesewas). */
export const PREMIUM_PRICE_PESEWAS = Number(
  process.env.NEXT_PUBLIC_PREMIUM_PRICE_PESEWAS || 9000, // 100 pesewas = GHS 1 → GHS 90.00 / mo
)

/** Price of Lincoln Pro (display only — there is no Pro checkout yet). */
export const PRO_PRICE_PESEWAS = Number(
  process.env.NEXT_PUBLIC_PRO_PRICE_PESEWAS || 22500, // GHS 225.00 / mo
)

export const PREMIUM_CURRENCY =
  process.env.NEXT_PUBLIC_PREMIUM_CURRENCY?.trim() || "GHS"

export const PREMIUM_PLAN_INTERVAL = "month" as const

function formatPrice(pesewas: number): string {
  const major = (pesewas / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${PREMIUM_CURRENCY} ${major}`
}

/** Human-readable price, e.g. "GHS 90.00". */
export function formatPremiumPrice(): string {
  return formatPrice(PREMIUM_PRICE_PESEWAS)
}

/** Human-readable Pro price, e.g. "GHS 225.00". */
export function formatProPrice(): string {
  return formatPrice(PRO_PRICE_PESEWAS)
}

/**
 * One line on a plan card. `soon` marks something that is on the plan but
 * not built yet — shown with a "Coming soon" tag rather than presented as
 * working. Flip it off (or delete it) when the feature ships.
 */
export interface PlanFeature {
  /** Looks up the translation: `pr.f.<id>` (lib/i18n/pricing-messages.ts). */
  id: string
  /** English text (also the fallback). */
  text: string
  soon?: boolean
}

/** What Lincoln Premium adds on top of Free — shown on /pricing. */
export const PREMIUM_FEATURES: PlanFeature[] = [
  { id: "liveView", text: "AR / Live View camera navigation" },
  { id: "noAds", text: "No ads, anywhere" },
  { id: "voice", text: "Turn-by-turn voice navigation" },
  { id: "saved", text: "Multiple saved locations — unlimited saved places and trip history" },
  { id: "traffic", text: "Advanced traffic — live traffic on the map and traffic-aware travel times" },
  { id: "offline", text: "Offline maps (save areas to your phone)" },
  { id: "routeOptions", text: "Advanced route options — fastest or shortest, avoid highways, tolls and ferries, and route choices" },
  { id: "alerts", text: "Real-time road alerts — hazards within 5 km of you, as they are reported" },
  { id: "landmark", text: "Local knowledge search — find a place by a landmark (“opposite the filling station”)" },
  { id: "business", text: "Advanced business discovery — opening hours, phone, website, distance and filters on nearby places" },
]

/** What Lincoln Pro adds on top of Premium — shown on /pricing. */
export const PRO_FEATURES: PlanFeature[] = [
  { id: "runs", text: "Professional navigation — run a multi-stop route stop by stop, with progress" },
  { id: "fleet", text: "Fleet tools — up to 25 vehicles, and where each one is, live" },
  { id: "truck", text: "Advanced routing — truck routing by height, width, length and weight" },
  { id: "analytics", text: "Business analytics — distance, time moving and speeds per vehicle, per day" },
  { id: "optimize", text: "Route optimization — enter up to 12 stops, get the best order and route" },
]

/* --------------------- entitlement gates --------------------- */

/**
 * Named premium capabilities. Gate a feature by checking one of
 * these against the entitlement (client: `usePremium().can(...)` or
 * `hasActivePremium()` in lib/premium; server: `requirePremium()`
 * in lib/premium-guard).
 *
 * Status:
 *   voiceNavigation      — LIVE, gated (see directions-panel + use-live-navigation)
 *   unlimitedSavedPlaces — LIVE, gated (see use-saved-places)
 *   unlimitedTripHistory — LIVE, gated (see use-recent-searches)
 *   liveView             — LIVE, gated (see directions-panel: the Live View button)
 *   offlineMaps          — built: client-side, components/map/offline-maps.tsx (no server resource, so UI-gated only)
 *   priorityRouting      — not built yet
 */
export type PremiumFeature =
  | "voiceNavigation"
  | "unlimitedSavedPlaces"
  | "unlimitedTripHistory"
  | "liveView"
  | "offlineMaps"
  | "priorityRouting"

/** Per-tier numeric limits. `Infinity` means no limit. */
export const FREE_LIMITS = {
  savedPlaces: 10,
  tripHistory: 5,
} as const

export const PREMIUM_LIMITS = {
  savedPlaces: Number.POSITIVE_INFINITY,
  tripHistory: 50,
} as const

export type TierLimits = { savedPlaces: number; tripHistory: number }

/** Feature list for the free tier — shown on /pricing. */
export const FREE_FEATURES: PlanFeature[] = [
  { id: "turnByTurn", text: "Turn-by-turn navigation" },
  { id: "freeTraffic", text: "Live traffic — how busy your driving route is right now" },
  { id: "map", text: "Full Ghana map and search" },
  { id: "gps", text: "GPS positioning" },
  { id: "modes", text: "Walking, driving, motorcycle, bus, bike, train and boat directions" },
  { id: "nearby", text: "Explore nearby places" },
  { id: "freeSaved", text: `Up to ${FREE_LIMITS.savedPlaces} saved places` },
]

/* ------------------------ advertising ------------------------- */

/** Where business advertising / sponsorship enquiries are sent. */
export const ADVERTISE_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_ADVERTISE_EMAIL?.trim() ||
  "advertise@lincolnnavigation.com"

/** How long one sponsorship payment keeps a listing live, from approval. */
export const SPONSOR_DAYS = 30

export type SponsorPackageId = "local" | "citywide"

/**
 * Sponsored-place packages sold on /advertise. One payment = one
 * category for SPONSOR_DAYS; the listing shows when the map is centred
 * within `radiusKm` of the business. Prices can be overridden per
 * deployment with the NEXT_PUBLIC_SPONSOR_*_PESEWAS env vars.
 */
export const SPONSOR_PACKAGES: {
  id: SponsorPackageId
  label: string
  radiusKm: number
  pricePesewas: number
  blurb: string
}[] = [
  {
    id: "local",
    label: "Local",
    radiusKm: 5,
    pricePesewas: Number(process.env.NEXT_PUBLIC_SPONSOR_LOCAL_PESEWAS || 20000), // GHS 200
    blurb: "Seen by people browsing within 5 km of your business.",
  },
  {
    id: "citywide",
    label: "City-wide",
    radiusKm: 25,
    pricePesewas: Number(process.env.NEXT_PUBLIC_SPONSOR_CITYWIDE_PESEWAS || 60000), // GHS 600
    blurb: "Seen across the city — anyone browsing within 25 km.",
  },
]

export function sponsorPackage(id: string) {
  return SPONSOR_PACKAGES.find((p) => p.id === id) ?? null
}

/** Human-readable sponsorship price, e.g. "GHS 200.00". */
export function formatSponsorPrice(pesewas: number): string {
  return formatPrice(pesewas)
}

/**
 * House promo — our own ad for the advertising programme, shown in
 * the "Explore Nearby" panel for any category that has no paid
 * sponsor. It's clearly labelled as coming from Lincoln Navigation
 * (not "Sponsored") and links to /advertise. Set
 * NEXT_PUBLIC_HOUSE_PROMO=off to hide it once real advertisers fill
 * the slots.
 */
export const HOUSE_PROMO_ENABLED =
  process.env.NEXT_PUBLIC_HOUSE_PROMO?.trim().toLowerCase() !== "off"

export const HOUSE_PROMO = {
  headline: "Own a business near here?",
  body: "Get pinned to the top of these results. Reach people already heading your way.",
  ctaLabel: "Advertise on Lincoln Navigation",
  href: "/advertise",
} as const
