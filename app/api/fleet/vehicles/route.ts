import { NextRequest, NextResponse } from "next/server"
import {
  MAX_VEHICLES,
  VEHICLE_COLUMNS,
  VEHICLE_KINDS,
  hashToken,
  newDriverToken,
  requireFleetOwner,
} from "@/lib/fleet-server"

/* Fleet vehicles (Pro): list and add. Owner only — see lib/fleet-server.ts. */

export async function GET(request: NextRequest) {
  const ctx = await requireFleetOwner(request)
  if ("error" in ctx) return ctx.error

  const { data, error } = await ctx.admin
    .from("fleet_vehicles")
    .select(VEHICLE_COLUMNS)
    .eq("owner_id", ctx.user.id)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[fleet] list failed:", error.message)
    return NextResponse.json({ error: "Could not load vehicles." }, { status: 502 })
  }
  return NextResponse.json({ vehicles: data ?? [], serverTime: new Date().toISOString() })
}

export async function POST(request: NextRequest) {
  const ctx = await requireFleetOwner(request)
  if ("error" in ctx) return ctx.error

  let body: { name?: unknown; plate?: unknown; kind?: unknown } | null = null
  try {
    body = await request.json()
  } catch {}

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : ""
  const plate = typeof body?.plate === "string" ? body.plate.trim().slice(0, 20) : ""
  const kind = VEHICLE_KINDS.find((k) => k === body?.kind) ?? "car"
  if (!name) return NextResponse.json({ error: "Give the vehicle a name." }, { status: 400 })

  const { count } = await ctx.admin
    .from("fleet_vehicles")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ctx.user.id)
  if ((count ?? 0) >= MAX_VEHICLES) {
    return NextResponse.json({ error: `You can have up to ${MAX_VEHICLES} vehicles.` }, { status: 400 })
  }

  const token = newDriverToken()
  const { data, error } = await ctx.admin
    .from("fleet_vehicles")
    .insert({
      owner_id: ctx.user.id,
      name,
      plate: plate || null,
      kind,
      driver_token_hash: hashToken(token),
    })
    .select(VEHICLE_COLUMNS)
    .single()

  if (error || !data) {
    console.error("[fleet] create failed:", error?.message)
    return NextResponse.json({ error: "Could not add the vehicle." }, { status: 502 })
  }
  // The token is shown once, here; only its hash is stored.
  return NextResponse.json({ vehicle: data, driverToken: token }, { status: 201 })
}
