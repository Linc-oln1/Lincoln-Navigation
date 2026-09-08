// app/auth/callback/route.ts
//
// OAuth / magic-link landing route. Supabase redirects here with a
// ?code=... which we exchange for a session cookie, then send the
// user on to ?next (default /app).

import { NextResponse } from "next/server"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { siteOrigin } from "@/lib/site-url"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const nextParam = url.searchParams.get("next") || "/app"
  // Only allow same-site relative redirects.
  const next = nextParam.startsWith("/") ? nextParam : "/app"
  const origin = siteOrigin(request)

  if (AUTH_ENABLED && code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
