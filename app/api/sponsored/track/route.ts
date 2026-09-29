// app/api/sponsored/track/route.ts
//
// Counts a view ("impression"), an open ("click") or a "Visit website"
// tap ("website") for a sponsored place, for the advertiser's report.
// The browser sends these with navigator.sendBeacon, so the answer is
// always a bare 204. Only live sponsors are counted, and each visitor
// is capped per sponsor per hour so the numbers can't be padded.

import { clientIp } from "@/lib/hazard-identity"
import { overLimit } from "@/lib/rate-limit"
import { bumpSponsorStat, isLiveSponsor } from "@/lib/sponsor-store"

const KINDS = new Set(["impression", "click", "website"])
/** Per visitor, per sponsor, per kind, per hour. */
const HOURLY_CAP = { impression: 20, click: 10, website: 10 } as const

const done = () => new Response(null, { status: 204 })

export async function POST(req: Request) {
  let id = ""
  let kind = ""
  try {
    const body = (await req.json()) as { id?: unknown; kind?: unknown }
    id = typeof body.id === "string" ? body.id : ""
    kind = typeof body.kind === "string" ? body.kind : ""
  } catch {
    return done()
  }
  if (!/^[0-9a-f-]{36}$/i.test(id) || !KINDS.has(kind)) return done()

  const k = kind as keyof typeof HOURLY_CAP
  if (await overLimit(`sponsor:${k}:${id}:${clientIp(req)}`, HOURLY_CAP[k], 3600)) return done()
  if (!(await isLiveSponsor(id))) return done()

  await bumpSponsorStat(id, k)
  return done()
}
