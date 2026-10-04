// app/api/referral/claim/route.ts
//
//   POST { code } → { claimed: boolean }
//
// Links the signed-in user to whoever owns `code`. Email sign-ups carry the
// code in metadata and are linked by a DB trigger; this covers Google
// sign-ups. Only works once, only for accounts under a day old, never for
// your own code.

import { NextResponse } from "next/server"
import { cleanReferralCode } from "@/lib/referral"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "sign_in_required" }, { status: 401 })
  if (!ADMIN_ENABLED) return NextResponse.json({ claimed: false })

  let code: string | null = null
  try {
    code = cleanReferralCode(((await req.json()) as { code?: unknown }).code as string)
  } catch {}
  if (!code) return NextResponse.json({ claimed: false })

  if (Date.now() - new Date(user.created_at).getTime() > 24 * 3600 * 1000) {
    return NextResponse.json({ claimed: false })
  }

  const admin = createAdminClient()
  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle()
  if (!referrer || referrer.id === user.id) return NextResponse.json({ claimed: false })

  const { data } = await admin
    .from("profiles")
    .update({ referred_by: referrer.id, referred_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("referred_by", null)
    .select("id")
  return NextResponse.json({ claimed: Boolean(data?.length) })
}
