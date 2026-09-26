// lib/supabase/admin.ts  (server only)
//
// Service-role Supabase client. It bypasses row level security, so it is
// only ever used inside route handlers that have already decided who the
// caller is (see lib/fleet-server.ts). Never import this from client code.

import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL } from "./config"

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ""

/** True once the project URL and the service-role key are both set. */
export const ADMIN_ENABLED = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY)

export function createAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
