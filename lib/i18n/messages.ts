import type { LangCode } from "@/lib/i18n/languages"
import { MAP_EN } from "@/lib/i18n/map-messages"
import { FEATURES_EN } from "@/lib/i18n/features-messages"
import { HOME_EN } from "@/lib/i18n/home-messages"
import { AUTH_EN } from "@/lib/i18n/auth-messages"
import { PRICING_EN } from "@/lib/i18n/pricing-messages"

/**
 * English is the source of truth. Every other language may leave a key out
 * and it falls back to English, so a half-translated screen never breaks.
 */
const baseEn = {
  "map.report": "Report",
  "map.exitShort": "Exit",
  "nav.search": "Search",
  "nav.saved": "Saved",
  "nav.map": "Map",
  "nav.pricing": "Pricing",
  "nav.goPremium": "Go Premium",
  "nav.about": "About",
  "nav.advertise": "Advertise",
  "nav.contact": "Contact",
  "nav.signIn": "Sign in",
  "nav.myAccount": "My account",
  "nav.liveMap": "Live map",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.language": "Language",
  "nav.explore": "Explore",
  "nav.features": "Features",
  "nav.places": "Places",
  "nav.routes": "Routes",
  "nav.trotro": "Trotro guide",

  "footer.product": "Product",
  "footer.company": "Company",
  "footer.legal": "Legal",
  "footer.account": "Account",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.cookies": "Cookies",
  "footer.refunds": "Refunds",
  "footer.adsPolicy": "Ads & affiliates",
  "footer.attributions": "Map data",
  "footer.security": "Security",
  "footer.tagline": "Maps and navigation for Ghana",

  "home.launch": "Launch Map",
  "home.facts": "History & Facts",
  "home.hideFacts": "Hide History & Facts",
  "home.tagLeft":
    "A clear path through every street, roundabout, and detour — built for how Ghana actually moves.",
  "home.tagRight": "Real-time routes and live positioning, whichever way you're headed.",
  "home.startExploring": "Start Exploring",

  "map.search": "Search anywhere...",
  "map.exit": "Exit map",

  "dir.title": "Directions",
  "dir.close": "Close directions",
  "dir.start": "Starting point",
  "dir.dest": "Destination",
  "dir.currentLoc": "Use current location",
  "dir.swap": "Swap locations",
  "dir.get": "Get Directions",
  "dir.calculating": "Calculating route...",
  "dir.startLive": "Start Live Navigation",
  "dir.liveActive": "Live Navigation Active",
  "dir.stopLive": "Stop Live Navigation",
  "dir.liveView": "Live View (camera)",
  "dir.turnByTurn": "Turn-by-turn",
  "dir.estimated": "Estimated",
  "dir.liveEta": "Live ETA",

  "mode.driving": "Drive",
  "mode.motorcycle": "Motorcycle",
  "mode.bus": "Bus",
  "mode.walking": "Walk",
  "mode.cycling": "Bike",

  "stop.title": "Stop navigation?",
  "stop.keep": "Keep navigating",
  "stop.exitDesc":
    "You're in the middle of a trip. Leaving the map will end live navigation and turn off voice guidance.",
  "stop.closeDesc":
    "You're in the middle of a trip. Closing directions will end live navigation and turn off voice guidance.",
  "stop.exit": "Stop & exit",
  "stop.close": "Stop & close",

  "lv.toTurn": "to next turn",
  "lv.toDest": "to destination",
  "lv.then": "Then:",
  "lv.enableCompass": "Enable compass",
  "lv.walkNote": "Keep looking where you're walking — glance at the screen, don't stare.",
  "lv.driveNote": "Mount your phone before you drive. Never hold or touch it while driving.",
  "lv.rideNote":
    "Mount your phone securely before you ride. Never hold or touch it while riding.",



  // Professional navigation / runs (Pro). English only for now.

} as const

const en = { ...baseEn, ...MAP_EN, ...FEATURES_EN, ...HOME_EN, ...AUTH_EN, ...PRICING_EN } as const

export type MessageKey = keyof typeof en

export type Dict = Partial<Record<MessageKey, string>>

/**
 * English is always here. Every other language lives in
 * lib/i18n/translations.ts (~900 KB for all of them), which loadLanguage()
 * fetches the first time a non-English language is chosen — so the pages
 * an English visitor loads don't carry it.
 */
const MESSAGES: Partial<Record<LangCode, Dict>> = { en }

let translationsLoad: Promise<void> | null = null

/** Makes `lang` available to translate(). Resolves at once for English. */
export function loadLanguage(lang: LangCode): Promise<void> {
  if (MESSAGES[lang]) return Promise.resolve()
  translationsLoad ??= import("@/lib/i18n/translations")
    .then(({ TRANSLATIONS }) => {
      Object.assign(MESSAGES, TRANSLATIONS)
    })
    .catch((err) => {
      translationsLoad = null // let the next call retry
      throw err
    })
  return translationsLoad
}

/** Looks a key up in `lang` (falling back to English) and fills {name} placeholders. */
export function translate(
  lang: LangCode,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const text = MESSAGES[lang]?.[key] ?? en[key]
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, name) =>
    name in params ? String(params[name]) : `{${name}}`,
  )
}
