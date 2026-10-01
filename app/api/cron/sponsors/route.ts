// app/api/cron/sponsors/route.ts
//
// Daily (vercel.json, 08:00 UTC = 08:00 in Accra). For sponsored listings:
//   - paid and waiting for review  → a digest to every ADMIN_EMAILS address
//   - live, ending within 5 days    → "your listing ends in N days"
//   - live but past its end date    → status "ended" + "your listing has ended"
//                                     with its view / open / website numbers
// Every email goes once per event (lib/email sendOnce), so re-running is safe.
//
// Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set;
// then nothing else may run this.

import { NextResponse } from "next/server"
import { EMAIL_ENABLED } from "@/lib/email"
import {
  sendListingEndingSoon,
  sendListingEnded,
  sendPendingDigest,
} from "@/lib/sponsor-emails"
import { listAllSponsorsWithStats } from "@/lib/sponsor-store"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

const DAY_MS = 86_400_000
const REMIND_DAYS = 5

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!ADMIN_ENABLED) return NextResponse.json({ skipped: "Supabase service role not configured." })

  const sponsors = await listAllSponsorsWithStats()
  const now = Date.now()
  const today = new Date(now).toISOString().slice(0, 10)
  const result = { pending: 0, endingSoon: 0, ended: 0, emailFailures: 0, emailEnabled: EMAIL_ENABLED }
  const tally = (ok: boolean) => {
    if (!ok) result.emailFailures++
  }

  const pending = sponsors.filter((s) => s.status === "pending_review")
  result.pending = pending.length
  if (pending.length > 0) tally(await sendPendingDigest(pending, today))

  for (const s of sponsors) {
    if (s.status !== "active" || !s.ends_at) continue
    const msLeft = Date.parse(s.ends_at) - now

    if (msLeft <= 0) {
      // Already off the map (listLiveSponsors checks the date); make the
      // status say so, then tell the advertiser once.
      const { error } = await createAdminClient()
        .from("sponsors")
        .update({ status: "ended", updated_at: new Date(now).toISOString() })
        .eq("id", s.id)
        .eq("status", "active")
      if (error) console.error("[cron sponsors] could not end", s.id, error.message)
      result.ended++
      tally(await sendListingEnded(s, s.total))
    } else if (msLeft <= REMIND_DAYS * DAY_MS) {
      result.endingSoon++
      tally(await sendListingEndingSoon(s, Math.ceil(msLeft / DAY_MS)))
    }
  }

  return NextResponse.json(result)
}
