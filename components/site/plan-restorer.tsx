"use client"

import { useEffect } from "react"
import { useSession } from "@/hooks/use-session"
import { readEntitlement } from "@/lib/premium"

/**
 * Signed in but no plan on this device? Quietly ask the server whether the
 * account has a paid plan and, if so, put it back (a new phone, cleared
 * cookies, another browser). Once per browser session, and only when there's
 * nothing to restore over. Renders nothing.
 */
export function PlanRestorer() {
  const { user, authEnabled } = useSession()

  useEffect(() => {
    if (!authEnabled || !user) return
    if (readEntitlement().active) return
    try {
      if (sessionStorage.getItem("ln_plan_restore") === user.id) return
      sessionStorage.setItem("ln_plan_restore", user.id)
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
