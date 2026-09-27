"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Clock, X } from "lucide-react"
import { usePremium } from "@/hooks/use-premium"

const WARN_DAYS = 5
const DISMISS_KEY = "ln_expiry_dismissed"

/**
 * Plans are paid 31 days at a time and don't renew by themselves, so a plan
 * that quietly ran out would look like features breaking. In the last few
 * days, say so once a day with a link to renew.
 */
export function PlanExpiryNotice() {
  const { isPremium, isPro, expiresAt } = usePremium()
  const [hidden, setHidden] = useState(true)

  const msLeft = expiresAt ? new Date(expiresAt).getTime() - Date.now() : null
  const daysLeft = msLeft === null ? null : Math.ceil(msLeft / 86_400_000)
  const due = isPremium && daysLeft !== null && daysLeft <= WARN_DAYS

  useEffect(() => {
    if (!due) return
    try {
      setHidden(localStorage.getItem(DISMISS_KEY) === new Date().toISOString().slice(0, 10))
    } catch {
      setHidden(false)
    }
  }, [due])

  if (!due || hidden) return null

  const plan = isPro ? "Pro" : "Premium"
  const text =
    daysLeft! <= 0 ? `Your ${plan} plan ends today.` : `Your ${plan} plan ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`

  return (
    <div
      role="status"
      className="absolute left-4 right-[4.5rem] top-[7.5rem] z-[1090] flex max-w-sm items-center gap-2 rounded-xl border border-amber-500/40 bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xl sm:left-auto sm:right-20"
    >
      <Clock className="h-4 w-4 flex-shrink-0 text-amber-500" aria-hidden />
      <span className="flex-1">
        {text}{" "}
        <Link href="/pricing" className="font-semibold text-primary hover:underline">
          Renew
        </Link>
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setHidden(true)
          try {
            localStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10))
          } catch {}
        }}
        className="rounded p-1 hover:bg-secondary"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
