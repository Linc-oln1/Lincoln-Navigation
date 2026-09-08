"use client"

// hooks/use-session.ts
//
// Current signed-in user for client components. Returns
// { user: null } and never touches Supabase when auth isn't
// configured.

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/client"

export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(AUTH_ENABLED)

  useEffect(() => {
    if (!AUTH_ENABLED) return

    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  return { user, loading, authEnabled: AUTH_ENABLED }
}
