// app/api/sponsored/route.ts
//
// The sponsored places that are live right now (public fields only).
// The places panel fetches this once and filters by category and map
// centre in the browser (lib/sponsored-places.ts). Cached briefly at
// the edge — approving or ending a sponsor shows up within a minute.

import { NextResponse } from "next/server"
import { listLiveSponsors } from "@/lib/sponsor-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const sponsors = await listLiveSponsors()
  return NextResponse.json(
    { sponsors },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  )
}
