"use client"

// hooks/use-premium.ts
//
// Client-side view of whether the current visitor has the premium
// plan. After a successful Paystack payment, /api/billing/verify
// sets a signed "ln_premium" cookie (httpOnly=false so this hook
// can read it) carrying the entitlement's expiry.
//
// NOTE: this is deliberately lightweight. There is no user account
// system yet, so entitlement lives in a cookie on the paying
// device. When accounts land, replace readEntitlement() with a
// server lookup keyed on the signed-in user. The cookie is still
// verified server-side (signature + expiry) everywhere it actually
// gates a paid resource — this hook only drives UI.

import { useCallback, useEffect, useState } from "react"
import { PREMIUM_ENABLED } from "@/lib/monetization"

const COOKIE_NAME = "ln_premium"

interface Entitlement {
  active: boolean
  /** ISO date the entitlement lapses, if known. */
  expiresAt: string | null
}

function readEntitlement(): Entitlement {
  if (typeof document === "undefined") return { active: false, expiresAt: null }
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      ?.slice(COOKIE_NAME.length + 1)
    if (!raw) return { active: false, expiresAt: null }

    // Cookie value is `${base64url(payload)}.${signature}`. We only
    // read the payload here; the signature is checked server-side.
    const payloadPart = decodeURIComponent(raw).split(".")[0]
    const json = JSON.parse(
      atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number }

    if (!json.exp) return { active: false, expiresAt: null }
    const expiresAt = new Date(json.exp * 1000)
    return {
      active: expiresAt.getTime() > Date.now(),
      expiresAt: expiresAt.toISOString(),
    }
  } catch {
    return { active: false, expiresAt: null }
  }
}

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

  return {
    /** Billing is configured for this deployment. */
    available: PREMIUM_ENABLED,
    /** This visitor currently has an active premium entitlement. */
    isPremium: entitlement.active,
    expiresAt: entitlement.expiresAt,
    refresh,
  }
}
