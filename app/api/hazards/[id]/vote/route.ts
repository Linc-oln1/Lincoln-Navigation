import { NextRequest, NextResponse } from "next/server"

import { getHazardStore } from "@/lib/hazard-store"
import { reporterHash } from "@/lib/hazard-identity"

/* =========================================================
   POST /api/hazards/:id/vote   { vote: "confirm" | "clear" }
     → { hazard, counted }
     → { error } (404 unknown/expired, 503 no store)

   "confirm" = still there, "clear" = gone now. One vote per
   reporter per hazard; enough net "clear" votes retires the
   hazard. `counted:false` means this reporter had already voted.
========================================================= */

export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const store = getHazardStore()
  if (!store) {
    return NextResponse.json(
      { error: "Hazard reporting isn't available yet." },
      { status: 503 }
    )
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: "Missing hazard id." }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const vote = (body as Record<string, unknown>)?.vote
  if (vote !== "confirm" && vote !== "clear") {
    return NextResponse.json(
      { error: 'vote must be "confirm" or "clear".' },
      { status: 400 }
    )
  }

  const result = await store.vote(id, vote, reporterHash(request))
  if (!result) {
    return NextResponse.json(
      { error: "That hazard is no longer active." },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
