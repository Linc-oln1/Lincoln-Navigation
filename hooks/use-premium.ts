"use client"

// hooks/use-premium.ts
//
// React view of the premium entitlement, for driving UI. The
// underlying cookie read/validation lives in lib/premium.ts so
// non-hook code (voice path, saved-places cap) can share it.
//
// NOTE: deliberately lightweight. There is no account system yet,
// so entitlement lives in a signed cookie on the paying device.
// When accounts land, swap readEntitlement() for a server lookup
// keyed on the signed-in user. Anything gating a real server
// resource must still verify the signature server-side
// (lib/premium-guard) — this hook only drives UI.

import { useCallback, useEffect, useMemo, useState } from "react"
import { PREMIUM_ENABLED, FREE_LIMITS, PREMIUM_LIMITS, type PremiumFeature } from "@/lib/monetization"
import { readEntitlement, type Entitlement } from "@/lib/premium"

export function usePremium() {
  const [entitlement, setEntitlement] = useState<Entitlement>({
    active: false,
    expiresAt: null,
  })

  const refresh = useCallback(() => setEntitlement(readEntitlement()), [])

  useEffect(() => {
    refresh()
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refresh])

  const isPremium = entitlement.active

  const can = useCallback(
    (_feature: PremiumFeature) => isPremium,
    [isPremium],
  )

  const limits = useMemo(
    () => (isPremium ? PREMIUM_LIMITS : FREE_LIMITS),
    [isPremium],
  )

  return {
    /** Billing is configured for this deployment. */
    available: PREMIUM_ENABLED,
    /** This visitor currently has an active premium entitlement. */
    isPremium,
    expiresAt: entitlement.expiresAt,
    /** Gate a named capability: `can("voiceNavigation")`. */
    can,
    /** Numeric limits for the current tier (savedPlaces, tripHistory). */
    limits,
    refresh,
  }
}
