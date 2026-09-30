/**
 * Showing plan prices in a visitor's own currency.
 *
 * Display only: Paystack always charges in GHS, and the card issuer does
 * the conversion. Converted amounts are therefore shown as estimates
 * ("≈"), next to the real GHS charge. Rates come from /api/currency
 * (ExchangeRate-API's open endpoint, refreshed daily, base GHS).
 */

export const BASE_CURRENCY = "GHS"

/** Where to send people for the rates credit the open API asks for. */
export const RATES_CREDIT_URL = "https://www.exchangerate-api.com"

/** ISO 3166 country → ISO 4217 currency, for the countries we can price in. */
const COUNTRY_CURRENCY: Record<string, string> = {
  // West Africa
  GH: "GHS", NG: "NGN", SL: "SLE", LR: "LRD", GM: "GMD", GN: "GNF", CV: "CVE", MR: "MRU",
  BJ: "XOF", BF: "XOF", CI: "XOF", GW: "XOF", ML: "XOF", NE: "XOF", SN: "XOF", TG: "XOF",
  // Central Africa
  CM: "XAF", CF: "XAF", TD: "XAF", CG: "XAF", GQ: "XAF", GA: "XAF", CD: "CDF", ST: "STN",
  // East & Southern Africa
  KE: "KES", UG: "UGX", TZ: "TZS", RW: "RWF", BI: "BIF", ET: "ETB", SO: "SOS", DJ: "DJF",
  ER: "ERN", SS: "SSP", SD: "SDG", ZA: "ZAR", NA: "NAD", BW: "BWP", LS: "LSL", SZ: "SZL",
  ZM: "ZMW", ZW: "ZWL", MW: "MWK", MZ: "MZN", AO: "AOA", MG: "MGA", MU: "MUR", SC: "SCR", KM: "KMF",
  // North Africa & Middle East
  EG: "EGP", MA: "MAD", DZ: "DZD", TN: "TND", LY: "LYD", AE: "AED", SA: "SAR", QA: "QAR",
  KW: "KWD", BH: "BHD", OM: "OMR", JO: "JOD", LB: "LBP", IL: "ILS", TR: "TRY", IQ: "IQD", IR: "IRR",
  // Europe
  GB: "GBP", CH: "CHF", NO: "NOK", SE: "SEK", DK: "DKK", IS: "ISK", PL: "PLN", CZ: "CZK",
  HU: "HUF", RO: "RON", BG: "BGN", RS: "RSD", UA: "UAH", RU: "RUB", BY: "BYN", MD: "MDL",
  AL: "ALL", MK: "MKD", BA: "BAM", GE: "GEL", AM: "AMD", AZ: "AZN",
  AT: "EUR", BE: "EUR", HR: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR", DE: "EUR",
  GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR", NL: "EUR",
  PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR", MC: "EUR", SM: "EUR", VA: "EUR", AD: "EUR", ME: "EUR", XK: "EUR",
  // Americas
  US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  UY: "UYU", PY: "PYG", BO: "BOB", VE: "VES", EC: "USD", PA: "USD", SV: "USD", PR: "USD",
  CR: "CRC", GT: "GTQ", HN: "HNL", NI: "NIO", DO: "DOP", JM: "JMD", TT: "TTD", BS: "BSD",
  BB: "BBD", HT: "HTG", CU: "CUP", GY: "GYD", SR: "SRD", BZ: "BZD",
  // Asia & Pacific
  CN: "CNY", HK: "HKD", MO: "MOP", TW: "TWD", JP: "JPY", KR: "KRW", IN: "INR", PK: "PKR",
  BD: "BDT", LK: "LKR", NP: "NPR", SG: "SGD", MY: "MYR", ID: "IDR", TH: "THB", VN: "VND",
  PH: "PHP", KH: "KHR", LA: "LAK", MM: "MMK", MN: "MNT", KZ: "KZT", UZ: "UZS", AF: "AFN",
  AU: "AUD", NZ: "NZD", FJ: "FJD", PG: "PGK",
}

/** Offered in the "Show prices in" picker, most relevant first. */
export const PICKER_CURRENCIES = [
  "GHS", "NGN", "XOF", "XAF", "KES", "ZAR", "USD", "EUR", "GBP", "CAD",
  "AED", "CNY", "INR", "AUD", "JPY", "CHF", "SAR", "EGP", "MAD", "UGX", "TZS", "RWF",
]

export function currencyForCountry(country: string | null | undefined): string | null {
  if (!country) return null
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? null
}

/** Currency implied by the device's language settings, e.g. "fr-CI" → XOF. */
export function currencyFromLocales(locales: readonly string[]): string | null {
  for (const l of locales) {
    const region = l.split(/[-_]/)[1]
    const c = region && region.length === 2 ? currencyForCountry(region) : null
    if (c) return c
  }
  return null
}

/** The currency's name in the viewer's language, e.g. "US Dollar". */
export function currencyName(code: string, locale?: string): string {
  try {
    return new Intl.DisplayNames(locale ? [locale] : undefined, { type: "currency" }).of(code) ?? code
  } catch {
    return code
  }
}

/**
 * A converted amount split into symbol and number, so the pricing card
 * can size them differently. Amounts of 100 or more drop the minor unit
 * ("₦10,408", not "₦10,407.72") — it's an estimate either way.
 */
export function formatConverted(
  amount: number,
  currency: string,
  locale?: string,
): { symbol: string; number: string; full: string } {
  const make = (display: "symbol" | "narrowSymbol") => {
    const opts: Intl.NumberFormatOptions = { style: "currency", currency, currencyDisplay: display }
    if (amount >= 100 || amount === 0) opts.maximumFractionDigits = 0
    try {
      return new Intl.NumberFormat(locale, opts)
    } catch {
      return new Intl.NumberFormat(undefined, opts)
    }
  }
  // "symbol" keeps dollars apart (US$ vs CA$ where it matters) but falls
  // back to the bare code for many currencies in a given locale ("NGN");
  // use the local sign ("₦") in that case.
  let fmt = make("symbol")
  if (fmt.formatToParts(amount).some((p) => p.type === "currency" && p.value === currency)) {
    fmt = make("narrowSymbol")
  }
  const parts = fmt.formatToParts(amount)
  const symbol = parts.filter((p) => p.type === "currency").map((p) => p.value).join("").trim()
  const number = parts
    .filter((p) => p.type !== "currency" && p.type !== "literal")
    .map((p) => p.value)
    .join("")
  return { symbol, number, full: fmt.format(amount) }
}
