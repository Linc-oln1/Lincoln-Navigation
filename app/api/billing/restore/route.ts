import { NextResponse } from "next/server"
import { mintPremiumCookie, PREMIUM_COOKIE_NAME } from "@/lib/premium-cookie"
import { getSessionUser } from "@/lib/supabase/server"
import { currentSubscription, findEntitlement, RENEWING } from "@/lib/plan-store"
import { grantReferralRewards, referralProUntil } from "@/lib/referral-rewards"
import { clientIp } from "@/lib/hazard-identity"
import { bump, overLimit, peek } from "@/lib/rate-limit"

/* Restore a paid plan on this device (signed-in users only). Also how a
   monthly renewal reaches the browser: PlanRestorer calls this as the
   cookie nears its end, and gets the newer payment back.
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

  // Free Pro days from referrals (paid plans take precedence while they last).
  // The reward check makes several admin calls, so cap how often one account can run it.
  if (!(await overLimit(`restore:referral:${user.id}`, 12, 60))) await grantReferralRewards(user)
  const purchase = await findEntitlement(user, reference)
  const paidEnd = purchase ? Math.floor(Date.parse(purchase.expires_at) / 1000) : 0
  const bonusEnd = await referralProUntil(user.id)

  let cookieInput: Parameters<typeof mintPremiumCookie>[0]
  let result: { plan: string; expiresAt: string }
  if (bonusEnd && bonusEnd > paidEnd) {
    cookieInput = { email: user.email ?? user.id, reference: "referral", plan: "pro", expiresAt: bonusEnd }
    result = { plan: "pro", expiresAt: new Date(bonusEnd * 1000).toISOString() }
  } else if (purchase) {
    const sub = await currentSubscription(user).catch(() => null)
    cookieInput = {
      email: purchase.email,
      reference: purchase.reference,
      plan: purchase.plan,
      expiresAt: paidEnd,
      renews: Boolean(sub && RENEWING.includes(sub.status) && sub.plan === purchase.plan),
    }
    result = { plan: purchase.plan, expiresAt: purchase.expires_at }
  } else {
    if (reference) await bump(missKey, MISS_WINDOW_S)
    return NextResponse.json({ restored: false })
  }
  const { value, maxAge } = mintPremiumCookie(cookieInput)

  const origin = new URL(req.url).origin
  const response = NextResponse.json({ restored: true, ...result })
  response.cookies.set(PREMIUM_COOKIE_NAME, value, {
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    httpOnly: false,
  })
  return response
}
