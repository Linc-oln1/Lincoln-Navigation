// lib/sponsor-renewal.ts
//
// Which sponsored listings an advertiser can renew themselves (from the
// emailed link, /advertise/renew), and for how much. A renewal is the same
// package again: SPONSOR_DAYS more on the same listing, no new review.

import { SPONSOR_DAYS, sponsorPackage } from "@/lib/monetization"
import type { SponsorRow } from "@/lib/sponsor-store"

const DAY_MS = 86_400_000

export type RenewalOffer =
  | { ok: true; pkg: NonNullable<ReturnType<typeof sponsorPackage>> }
  | { ok: false; reason: "custom" | "not-renewable" }

/** Approved listings that are live or have ended; custom deals go through us. */
export function renewalOffer(s: Pick<SponsorRow, "status" | "package">): RenewalOffer {
  if (s.status !== "active" && s.status !== "ended") return { ok: false, reason: "not-renewable" }
  const pkg = sponsorPackage(s.package)
  return pkg ? { ok: true, pkg } : { ok: false, reason: "custom" }
}

/** New end date: SPONSOR_DAYS from the current end if it's still ahead, else from now. */
export function renewedEndsAt(endsAt: string | null, now = Date.now()) {
  const from = Math.max(now, endsAt ? Date.parse(endsAt) : now)
  return new Date(from + SPONSOR_DAYS * DAY_MS).toISOString()
}
