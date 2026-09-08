// lib/supabase/server.ts
//
// Server Supabase client, bound to the request cookie jar. Use in
// Server Components, Route Handlers and Server Actions. Only call
// after checking AUTH_ENABLED.

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { AUTH_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component — cookies are read-only
          // there. The middleware refreshes the session cookie, so
          // this is safe to ignore.
        }
      },
    },
  })
}

/** The signed-in user, or null. Never throws. */
export async function getSessionUser() {
  if (!AUTH_ENABLED) return null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}
