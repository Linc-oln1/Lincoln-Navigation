// lib/supabase/middleware.ts
//
// Refreshes the Supabase auth session on every request so Server
// Components always see a current user. No-ops entirely when auth
// isn't configured.

import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { AUTH_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  if (!AUTH_ENABLED) return response

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // Touching getUser() is what triggers the token refresh + cookie
  // rewrite. Do not add logic between createServerClient and here.
  try {
    await supabase.auth.getUser()
  } catch {
    // Network hiccup talking to Supabase — serve the page anyway.
  }

  return response
}
