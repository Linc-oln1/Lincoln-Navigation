// lib/supabase/config.ts
//
// Supabase connection config. Auth stays completely inert until
// both public vars are set (locally in .env.local, in production in
// the Vercel dashboard) — see docs/SUPABASE_SETUP.md.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ""

/** True once the project is wired up. Gate every auth code path on this. */
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
