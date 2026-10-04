// Shared referral helpers. Codes are 8 chars from an unambiguous alphabet
// (see supabase/migrations/0011_referrals.sql).

export const REFERRAL_STORAGE_KEY = "ln_ref"

export function cleanReferralCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase()
  return /^[A-Z0-9]{6,12}$/.test(code) ? code : null
}
