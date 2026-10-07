"use client"

import { useEffect } from "react"
import { useSession } from "@/hooks/use-session"
import { REFERRAL_STORAGE_KEY, cleanReferralCode } from "@/lib/referral"

/**
 * Finishes a referral for sign-ups that couldn't carry the code in metadata
 * (Google): once signed in, send the code remembered from /signup?ref= to the
 * server, then forget it and collect the reward. Renders nothing.
 */
export function ReferralClaimer() {
  const { user } = useSession()
  useEffect(() => {
    if (!user) return
    let code: string | null = null
    try {
      code = cleanReferralCode(localStorage.getItem(REFERRAL_STORAGE_KEY))
    } catch {}
    if (!code) return
    fetch("/api/referral/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // PlanRestorer may have run before the link existed, so collect the
        // reward now and let usePremium re-read the cookie.
        if (!data?.claimed) return
        return fetch("/api/billing/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
          .then((res) => (res.ok ? res.json() : null))
          .then((r) => {
            if (r?.restored) window.dispatchEvent(new Event("focus"))
          })
      })
      .catch(() => {})
      .finally(() => {
        try {
          localStorage.removeItem(REFERRAL_STORAGE_KEY)
        } catch {}
      })
  }, [user])
  return null
}
