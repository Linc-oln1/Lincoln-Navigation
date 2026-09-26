"use client"

import Link from "next/link"
import { usePremium } from "@/hooks/use-premium"

/** The signed-in user's plan on this device, read from the same entitlement the rest of the app uses. */
export function AccountPlanRow() {
  const { isPremium, isPro, expiresAt } = usePremium()
  const plan = isPro ? "Pro" : isPremium ? "Premium" : "Free"
  const until = expiresAt ? new Date(expiresAt).toLocaleDateString() : null

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <dt className="text-sm text-muted-foreground">Plan</dt>
      <dd className="text-right">
        <span className="text-sm font-medium">{plan}</span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isPremium ? (
            <>Active{until ? ` until ${until}` : ""} on this device.</>
          ) : (
            <>
              Upgrade for Live View, offline maps, voice and more.{" "}
              <Link href="/pricing" className="font-semibold text-primary hover:underline">
                See plans
              </Link>
            </>
          )}
        </p>
      </dd>
    </div>
  )
}
