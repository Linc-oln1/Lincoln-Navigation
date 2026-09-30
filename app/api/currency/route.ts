import { NextRequest, NextResponse } from "next/server"
import { BASE_CURRENCY, currencyForCountry } from "@/lib/currency"

/* =========================================================
   GET /api/currency
     → { country, currency, rates, updatedAt }

   `country` is the visitor's country from Vercel's IP geolocation
   header (null locally), and `currency` its currency when we know it.
   `rates` are units of each currency per 1 GHS, from ExchangeRate-API's
   open endpoint (no key; daily updates; attribution shown on /pricing).
   Rates are cached on the server for 6 hours. If they can't be fetched
   the response has rates: null and the page just shows cedis.

   The response varies per visitor (country), so it is never cached by
   the CDN — only privately by the browser.
========================================================= */

export const runtime = "nodejs"

const RATES_URL = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`

async function loadRates(): Promise<{ rates: Record<string, number>; updatedAt: string } | null> {
  try {
    const res = await fetch(RATES_URL, { next: { revalidate: 6 * 60 * 60 } })
    if (!res.ok) return null
    const data = (await res.json()) as {
      result?: string
      rates?: Record<string, number>
      time_last_update_utc?: string
    }
    if (data.result !== "success" || !data.rates) return null
    return {
      rates: data.rates,
      updatedAt: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString() : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const raw = request.headers.get("x-vercel-ip-country")
  const country = raw && /^[A-Z]{2}$/.test(raw) ? raw : null
  const loaded = await loadRates()

  return NextResponse.json(
    {
      country,
      currency: currencyForCountry(country),
      rates: loaded?.rates ?? null,
      updatedAt: loaded?.updatedAt ?? null,
    },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  )
}
