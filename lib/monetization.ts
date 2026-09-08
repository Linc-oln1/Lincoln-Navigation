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
//   3. Premium            — a paid tier (ad-free, offline maps,
//                           advanced routing) billed via Paystack.

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
  process.env.NEXT_PUBLIC_PREMIUM_PRICE_PESEWAS || 3000, // 100 pesewas = GHS 1 → GHS 30.00 / mo
)

export const PREMIUM_CURRENCY =
  process.env.NEXT_PUBLIC_PREMIUM_CURRENCY?.trim() || "GHS"

export const PREMIUM_PLAN_INTERVAL = "month" as const

/** Human-readable price, e.g. "GHS 30.00". */
export function formatPremiumPrice(): string {
  const major = (PREMIUM_PRICE_PESEWAS / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${PREMIUM_CURRENCY} ${major}`
}

/** What the paid tier unlocks — shown on /pricing. */
export const PREMIUM_FEATURES: string[] = [
  "No ads, anywhere",
  "Offline maps for every region of Ghana",
  "Turn-by-turn voice navigation",
  "Unlimited saved places and trip history",
  "Priority routing with live traffic avoidance",
]

/** Feature list for the free tier — shown on /pricing. */
export const FREE_FEATURES: string[] = [
  "Full Ghana map and search",
  "Driving, transit, cycling and walking directions",
  "Explore nearby places",
  "Up to 10 saved places",
]

/* ------------------------ advertising ------------------------- */

/** Where business advertising / sponsorship enquiries are sent. */
export const ADVERTISE_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_ADVERTISE_EMAIL?.trim() ||
  "advertise@lincolnnavigation.com"

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
