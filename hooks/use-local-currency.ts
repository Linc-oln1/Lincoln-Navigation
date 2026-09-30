"use client"

import { useCallback, useEffect, useState } from "react"
import { BASE_CURRENCY, currencyFromLocales } from "@/lib/currency"

const STORAGE_KEY = "ln_currency"

interface CurrencyInfo {
  country: string | null
  currency: string | null
  rates: Record<string, number> | null
  updatedAt: string | null
}

/**
 * Which currency to show prices in, and the rate from GHS.
 *
 * Choice order: the visitor's own pick (remembered) → their country from
 * the connection → their device's region setting → GHS. Until rates load,
 * or if they can't, everything stays in GHS.
 */
export function useLocalCurrency() {
  const [info, setInfo] = useState<CurrencyInfo | null>(null)
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    try {
      setPicked(localStorage.getItem(STORAGE_KEY))
    } catch {}
    const controller = new AbortController()
    fetch("/api/currency", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CurrencyInfo | null) => d && setInfo(d))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const rates = info?.rates ?? null
  const usable = (c: string | null | undefined): c is string => !!c && (c === BASE_CURRENCY || !!rates?.[c])

  const detected =
    (usable(info?.currency) && info!.currency) ||
    (typeof navigator !== "undefined" && usable(currencyFromLocales(navigator.languages ?? [navigator.language])) &&
      currencyFromLocales(navigator.languages ?? [navigator.language])) ||
    BASE_CURRENCY

  const currency = usable(picked) ? picked : detected
  const rate = currency === BASE_CURRENCY ? 1 : (rates?.[currency] ?? 1)

  const setCurrency = useCallback((c: string) => {
    setPicked(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {}
  }, [])

  return {
    currency,
    rate,
    /** True once rates have loaded, so a non-GHS currency can be shown. */
    ready: !!rates,
    isConverted: currency !== BASE_CURRENCY,
    detectedFromLocation: !usable(picked) && usable(info?.currency),
    availableRates: rates,
    updatedAt: info?.updatedAt ?? null,
    setCurrency,
  }
}
