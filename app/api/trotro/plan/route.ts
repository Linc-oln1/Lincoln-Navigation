// app/api/trotro/plan/route.ts
//
//   GET /api/trotro/plan?from=lat,lng&to=lat,lng[&fromName=…&toName=…]
//     → { plan: TrotroPlan }
//
// Trotro trip planner for Accra (lib/trotro/planner.ts). HIDDEN: it answers
// 404 to everyone except admins (lib/admin-auth.ts) until the TROTRO_PLANNER
// environment variable is set to "1". The map's directions panel just falls
// back to its normal behaviour when this returns 404.

import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { clientIp } from "@/lib/hazard-identity"
import { overLimit } from "@/lib/rate-limit"
import { planTrotro } from "@/lib/trotro/planner"
import type { LatLng } from "@/lib/trotro/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 })

/** Greater Accra with a margin; anything outside is "not covered" without any work. */
const ACCRA_BOX = { minLat: 5.3, maxLat: 5.95, minLng: -0.65, maxLng: 0.25 }
const inAccra = ([lat, lng]: LatLng) => lat >= ACCRA_BOX.minLat && lat <= ACCRA_BOX.maxLat && lng >= ACCRA_BOX.minLng && lng <= ACCRA_BOX.maxLng

function parsePoint(raw: string | null): LatLng | null {
  if (!raw) return null
  const [a, b, ...rest] = raw.split(",").map((v) => Number.parseFloat(v))
  if (rest.length || a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) return null
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null
  return [a, b]
}

const cleanName = (v: string | null) => (v ? v.replace(/[<>]/g, "").trim().slice(0, 120) || undefined : undefined)

export async function GET(req: Request) {
  if (process.env.TROTRO_PLANNER !== "1" && !(await getAdminUser())) return notFound()
  if (await overLimit(`trotro:${clientIp(req)}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 })
  }

  const url = new URL(req.url)
  const from = parsePoint(url.searchParams.get("from"))
  const to = parsePoint(url.searchParams.get("to"))
  if (!from || !to) return NextResponse.json({ error: "from and to must be lat,lng." }, { status: 400 })

  if (!inAccra(from) || !inAccra(to)) {
    return NextResponse.json({
      plan: { covered: false, itineraries: [], walkOnlyMinutes: null, dataNote: { source: "", feedDate: "", licence: "" } },
    })
  }

  const plan = planTrotro(from, to, { fromName: cleanName(url.searchParams.get("fromName")), toName: cleanName(url.searchParams.get("toName")) })
  return NextResponse.json({ plan }, { headers: { "Cache-Control": "private, no-store" } })
}
