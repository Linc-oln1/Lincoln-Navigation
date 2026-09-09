// lib/hazard-identity.ts  (server only)
//
// Turns a request into a stable, one-way "reporter hash" used only
// for de-duplication and rate-limiting hazard reports. It is NOT an
// identity: it's HMAC(ip + user-agent) with a server secret, can't
// be reversed, and nothing anywhere maps it back to a person. No
// account, no cookie, no PII is stored with a hazard report.

import { createHmac } from "node:crypto"

const SECRET =
  process.env.HAZARD_SALT ||
  process.env.PREMIUM_COOKIE_SECRET || // reuse the app's existing server secret
  process.env.PAYSTACK_SECRET_KEY ||
  "dev-only-insecure-hazard-salt"

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  )
}

export function reporterHash(req: Request): string {
  const ip = clientIp(req)
  const ua = req.headers.get("user-agent") || "unknown"
  return createHmac("sha256", SECRET)
    .update(`${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32)
}
