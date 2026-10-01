// lib/admin-auth.ts  (server only)
//
// Who may use /admin pages and /api/admin routes: signed-in users whose
// email is listed in ADMIN_EMAILS (comma-separated, set in Vercel and
// .env.local). With ADMIN_EMAILS unset nobody is an admin.

import { getSessionUser } from "@/lib/supabase/server"

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
)

/** Every admin address (for notifications such as a new paid listing). */
export function adminEmails(): string[] {
  return [...ADMIN_EMAILS]
}

/** The signed-in admin, or null for everyone else. */
export async function getAdminUser() {
  const user = await getSessionUser()
  const email = user?.email?.toLowerCase()
  return email && ADMIN_EMAILS.has(email) ? user : null
}
