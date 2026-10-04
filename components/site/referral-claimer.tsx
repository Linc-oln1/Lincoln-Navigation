"use client"

import { useEffect } from "react"
import { useSession } from "@/hooks/use-session"
import { REFERRAL_STORAGE_KEY, cleanReferralCode } from "@/lib/referral"

/**
 * Finishes a referral for sign-ups that couldn't carry the code in metadata
 * (Google): once signed in, send the code remembered from /signup?ref= to the
 * server, then forget it. Renders nothing.
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
      .catch(() => {})
      .finally(() => {
        try {
          localStorage.removeItem(REFERRAL_STORAGE_KEY)
        } catch {}
      })
  }, [user])
  return null
}
