// Every non-English language, merged per language code. Imported only by
// loadLanguage() in lib/i18n/messages.ts, so it becomes its own chunk.
import type { LangCode } from "@/lib/i18n/languages"
import type { Dict } from "@/lib/i18n/messages"
import { BASE_TR } from "@/lib/i18n/base-translations"
import { MAP_TR } from "@/lib/i18n/map-translations"
import { FEATURES_TR } from "@/lib/i18n/features-translations"
import { HOME_TR } from "@/lib/i18n/home-translations"
import { AUTH_TR } from "@/lib/i18n/auth-translations"
import { PRICING_TR } from "@/lib/i18n/pricing-translations"

export const TRANSLATIONS = Object.fromEntries(
  Object.keys(BASE_TR).map((code) => [
    code,
    {
      ...BASE_TR[code],
      ...(MAP_TR[code] ?? {}),
      ...(FEATURES_TR[code] ?? {}),
      ...(HOME_TR[code] ?? {}),
      ...(AUTH_TR[code] ?? {}),
      ...(PRICING_TR[code] ?? {}),
    } as Dict,
  ]),
) as Partial<Record<LangCode, Dict>>
