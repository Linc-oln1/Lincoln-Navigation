// app/api/admin/hazards/route.ts
//
// Admin only (lib/admin-auth.ts). GET lists the live crowd hazard reports,
// newest first, so abusive or false ones can be removed (see
// app/api/admin/hazards/[id]/route.ts). Everyone else gets a 404.

import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { getHazardStore } from "@/lib/hazard-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const store = getHazardStore()
  if (!store) return NextResponse.json({ error: "No hazard store is configured." }, { status: 501 })
  try {
    const hazards = (await store.listAll()).filter((h) => h.source === "crowd_report")
    return NextResponse.json({ hazards })
  } catch (error) {
    console.error("[admin hazards] list failed:", error)
    return NextResponse.json({ error: "Couldn't load hazards." }, { status: 500 })
  }
}
