// app/auth/signout/route.ts

import { NextResponse } from "next/server"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { siteOrigin } from "@/lib/site-url"

export async function POST(request: Request) {
  if (AUTH_ENABLED) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  // 303 so the browser follows with GET.
  return NextResponse.redirect(`${siteOrigin(request)}/`, { status: 303 })
}
