// lib/sponsor-link.ts  (server only)
//
// The private "Renew my listing" link we email to advertisers:
//   /advertise/renew?l=<sponsor id>&t=<signature>
// The signature stops anyone from guessing another business's link. It
// doesn't expire — all the link can do is let someone pay to extend that
// listing.

import { createHmac, timingSafeEqual } from "node:crypto"
import { siteUrl } from "@/lib/email"

const SECRET =
  process.env.SPONSOR_LINK_SECRET ||
  process.env.PREMIUM_COOKIE_SECRET ||
  process.env.PAYSTACK_SECRET_KEY || // fallback so it's never unset in prod
  "dev-only-insecure-secret"

export function renewToken(sponsorId: string) {
  return createHmac("sha256", SECRET).update(`renew:${sponsorId}`).digest("base64url").slice(0, 32)
}

export function isValidRenewToken(sponsorId: string, token: string | null | undefined) {
  if (!token) return false
  const a = Buffer.from(renewToken(sponsorId))
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Path of the renew page for a listing (add siteUrl() for emails). */
export function renewPath(sponsorId: string) {
  return `/advertise/renew?l=${encodeURIComponent(sponsorId)}&t=${renewToken(sponsorId)}`
}

export function renewUrl(sponsorId: string) {
  return `${siteUrl()}${renewPath(sponsorId)}`
}
