// app/api/admin/hazards/[id]/route.ts
//
// Admin only. DELETE takes a crowd hazard off the map immediately.

import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { getHazardStore } from "@/lib/hazard-store"

export const runtime = "nodejs"

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const store = getHazardStore()
  if (!store) return NextResponse.json({ error: "No hazard store is configured." }, { status: 501 })

  const { id } = await context.params
  // Crowd hazard ids are UUIDs; anything else never reaches the store.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const hazard = await store.get(id)
  // Only user-submitted reports can be removed; seed zones and forecast
  // flood zones are not stored here.
  if (hazard && hazard.source !== "crowd_report") {
    return NextResponse.json({ error: "Only crowd reports can be removed." }, { status: 400 })
  }
  try {
    const removed = await store.remove(id)
    console.info(`[admin hazards] removed ${id} (${removed ? "was live" : "already gone"})`)
    return NextResponse.json({ removed })
  } catch (error) {
    console.error("[admin hazards] remove failed:", error)
    return NextResponse.json({ error: "Couldn't remove it." }, { status: 500 })
  }
}
