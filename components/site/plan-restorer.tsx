"use client"

import { useEffect } from "react"
import { useSession } from "@/hooks/use-session"
import { readEntitlement } from "@/lib/premium"

/** A renewal is charged up to a couple of days before the cookie runs out. */
const RENEW_WINDOW_MS = 3 * 86_400_000
/** How often to ask while a renewal is due (it may not be charged yet). */
const RENEW_RETRY_MS = 6 * 3_600_000

/**
 * Signed in but no plan on this device? Quietly ask the server whether the
 * account has a paid plan and, if so, put it back (a new phone, cleared
 * cookies, another browser) — once per browser session.
 *
 * Same call when a monthly subscription is near the end of its paid period:
 * the webhook has recorded the renewal payment, and restore hands back a
 * cookie for the new month. Every few hours until it arrives. Renders nothing.
 */
export function PlanRestorer() {
  const { user, authEnabled } = useSession()

  useEffect(() => {
    if (!authEnabled || !user) return
    const ent = readEntitlement()
    const renewalDue =
      ent.active && ent.renews && ent.expiresAt !== null && Date.parse(ent.expiresAt) - Date.now() < RENEW_WINDOW_MS
    if (ent.active && !renewalDue) return

    try {
      if (renewalDue) {
        const last = Number(localStorage.getItem("ln_plan_renew_check") || 0)
        if (Date.now() - last < RENEW_RETRY_MS) return
        localStorage.setItem("ln_plan_renew_check", String(Date.now()))
      } else {
        if (sessionStorage.getItem("ln_plan_restore") === user.id) return
        sessionStorage.setItem("ln_plan_restore", user.id)
      }
    } catch {}

    fetch("/api/billing/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // usePremium re-reads the cookie whenever the window gets focus.
        if (data?.restored) window.dispatchEvent(new Event("focus"))
      })
      .catch(() => {})
  }, [user, authEnabled])

  return null
}
