// app/auth/confirm/route.ts
//
// Landing route for links in Supabase auth emails (confirm sign-up,
// password reset, magic link, email change, invite). The email
// templates link here with ?token_hash=...&type=... and we verify it
// server-side, so the link works on any device — unlike the PKCE
// ?code= flow in /auth/callback, which only works in the browser
// that requested the email.

import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { siteOrigin } from "@/lib/site-url"

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"]

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null
  const nextParam = url.searchParams.get("next") || "/app"
  // Only allow same-site relative redirects.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app"
  const origin = siteOrigin(request)

  if (AUTH_ENABLED && tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`)
}
