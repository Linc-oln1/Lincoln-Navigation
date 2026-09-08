// lib/premium-guard.ts  (server only)
//
// Server-side entitlement check for API routes that serve a paid
// resource (e.g. a future "priority routing" or "offline map pack"
// endpoint). Unlike the client helpers in lib/premium.ts, this
// verifies the cookie's HMAC signature — it can't be spoofed by
// editing document.cookie.
//
//   export async function POST(req: Request) {
//     const gate = requirePremium(req)
//     if (gate) return gate            // 402 for non-subscribers
//     ...serve the premium response...
//   }

import { NextResponse } from "next/server"
import { PREMIUM_COOKIE_NAME, verifyPremiumCookie } from "@/lib/premium-cookie"

/** The verified entitlement payload, or null if not premium. */
export function getPremiumEntitlement(req: Request) {
  const cookie = req.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${PREMIUM_COOKIE_NAME}=`))
    ?.slice(PREMIUM_COOKIE_NAME.length + 1)
  return verifyPremiumCookie(cookie ? decodeURIComponent(cookie) : null)
}

/**
 * Returns a 402 Response when the request is NOT from an active
 * premium subscriber, or null when it is (let the handler proceed).
 */
export function requirePremium(req: Request): NextResponse | null {
  if (getPremiumEntitlement(req)) return null
  return NextResponse.json(
    { error: "premium_required", upgrade: "/pricing" },
    { status: 402 },
  )
}
