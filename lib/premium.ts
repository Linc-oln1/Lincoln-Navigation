// lib/premium.ts
//
// Framework-free helpers for reading the premium entitlement in the
// browser. Used by the usePremium() hook AND by imperative code
// that can't call a hook (e.g. the voice path in
// use-live-navigation, the caps in use-saved-places).
//
// This reads the "ln_premium" cookie payload only — enough to drive
// UI and client-side limits. Anything that gates a real paid
// *server* resource must still verify the signature with
// lib/premium-guard (verifyPremiumCookie).

import {
  FREE_LIMITS,
  PREMIUM_LIMITS,
  type TierLimits,
} from "@/lib/monetization"

export const PREMIUM_COOKIE_NAME = "ln_premium"

export interface Entitlement {
  active: boolean
  /** ISO date the entitlement lapses, if known. */
  expiresAt: string | null
}

const INACTIVE: Entitlement = { active: false, expiresAt: null }

/** Parse + expiry-check the ln_premium cookie payload. Browser only. */
export function readEntitlement(): Entitlement {
  if (typeof document === "undefined") return INACTIVE
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${PREMIUM_COOKIE_NAME}=`))
      ?.slice(PREMIUM_COOKIE_NAME.length + 1)
    if (!raw) return INACTIVE

    // Cookie value is `${base64url(payload)}.${signature}`. The
    // signature is verified server-side; here we only read the exp.
    const payloadPart = decodeURIComponent(raw).split(".")[0]
    const json = JSON.parse(
      atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number }

    if (!json.exp) return INACTIVE
    const expiresAt = new Date(json.exp * 1000)
    return {
      active: expiresAt.getTime() > Date.now(),
      expiresAt: expiresAt.toISOString(),
    }
  } catch {
    return INACTIVE
  }
}

/** True when this device currently holds an active premium entitlement. */
export function hasActivePremium(): boolean {
  return readEntitlement().active
}

/** Numeric limits that apply to this device right now. */
export function getTierLimits(): TierLimits {
  return hasActivePremium() ? PREMIUM_LIMITS : FREE_LIMITS
}
