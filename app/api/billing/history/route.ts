// app/api/billing/history/route.ts
//
// GET → { payments: [...] }: the signed-in user's Premium / Pro payments for
// the payment history on /account (lib/plan-store paymentHistory). Payments
// made with their sign-in email before they had an account are included.

import { NextResponse } from "next/server"
import { paymentHistory } from "@/lib/plan-store"
import { getSessionUser } from "@/lib/supabase/server"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "sign_in_required" }, { status: 401 })
  try {
    return NextResponse.json({ payments: await paymentHistory(user) })
  } catch (error) {
    console.error("[billing history] could not load:", error)
    return NextResponse.json({ error: "Couldn't load payments." }, { status: 500 })
  }
}
