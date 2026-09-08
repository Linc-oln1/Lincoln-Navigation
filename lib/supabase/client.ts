"use client"

// lib/supabase/client.ts
//
// Browser Supabase client. Only call this after checking
// AUTH_ENABLED — createBrowserClient throws on empty credentials.

import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
