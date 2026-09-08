// lib/premium-cookie.ts  (server only)
//
// Mints and verifies the "ln_premium" entitlement cookie. The
// cookie value is `${base64url(payload)}.${hmacSHA256}` so it can't
// be forged without PREMIUM_COOKIE_SECRET. The client hook
// (hooks/use-premium.ts) reads the payload for UI; anything that
// actually gates a paid resource must call verifyPremiumCookie().

import { createHmac, timingSafeEqual } from "node:crypto"

export const PREMIUM_COOKIE_NAME = "ln_premium"

const SECRET =
  process.env.PREMIUM_COOKIE_SECRET ||
  process.env.PAYSTACK_SECRET_KEY || // fallback so it's never unset in prod
  "dev-only-insecure-secret"

interface PremiumPayload {
  /** Paystack customer email. */
  sub: string
  /** Issued-at (unix seconds). */
  iat: number
  /** Expiry (unix seconds). */
  exp: number
  /** Paystack reference that paid for this period. */
  ref: string
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function sign(data: string): string {
  return b64url(createHmac("sha256", SECRET).update(data).digest())
}

export function mintPremiumCookie(input: {
  email: string
  reference: string
  days?: number
}): { value: string; maxAge: number } {
  const now = Math.floor(Date.now() / 1000)
  const maxAge = (input.days ?? 31) * 24 * 60 * 60
  const payload: PremiumPayload = {
    sub: input.email,
    iat: now,
    exp: now + maxAge,
    ref: input.reference,
  }
  const encoded = b64url(Buffer.from(JSON.stringify(payload)))
  return { value: `${encoded}.${sign(encoded)}`, maxAge }
}

export function verifyPremiumCookie(
  value: string | undefined | null,
): PremiumPayload | null {
  if (!value) return null
  const [encoded, sig] = value.split(".")
  if (!encoded || !sig) return null

  const expected = sign(encoded)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(
      Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    ) as PremiumPayload
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
