import { NextResponse } from "next/server"
import { mintPremiumCookie, PREMIUM_COOKIE_NAME } from "@/lib/premium-cookie"
import { getSessionUser } from "@/lib/supabase/server"
import { findEntitlement } from "@/lib/plan-store"
import { clientIp } from "@/lib/hazard-identity"
import { bump, peek } from "@/lib/rate-limit"

/* Restore a paid plan on this device (signed-in users only).
   Body: { reference?: string } — optional payment reference from the receipt,
   for people who paid with a different email than they sign in with. */

const MISS_LIMIT = 10
const MISS_WINDOW_S = 10 * 60

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "sign_in_required" }, { status: 401 })

  let reference: string | null = null
  try {
    const body = (await req.json()) as { reference?: unknown }
    if (typeof body.reference === "string" && body.reference.trim()) reference = body.reference.trim().slice(0, 100)
  } catch {}

  // Guessing references: only wrong ones count against the limit.
  const missKey = `restore:miss:${user.id}:${clientIp(req)}`
  if (reference && (await peek(missKey)) >= MISS_LIMIT) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  const purchase = await findEntitlement(user, reference)
  if (!purchase) {
    if (reference) await bump(missKey, MISS_WINDOW_S)
    return NextResponse.json({ restored: false })
  }

  const expiresAt = Math.floor(Date.parse(purchase.expires_at) / 1000)
  const { value, maxAge } = mintPremiumCookie({
    email: purchase.email,
    reference: purchase.reference,
    plan: purchase.plan,
    expiresAt,
  })

  const origin = new URL(req.url).origin
  const response = NextResponse.json({ restored: true, plan: purchase.plan, expiresAt: purchase.expires_at })
  response.cookies.set(PREMIUM_COOKIE_NAME, value, {
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    httpOnly: false,
  })
  return response
}
