import { NextRequest, NextResponse } from "next/server"
import { VEHICLE_COLUMNS, VEHICLE_KINDS, hashToken, newDriverToken, requireFleetOwner } from "@/lib/fleet-server"

const UUID = /^[0-9a-f-]{36}$/i

/** Rename / retype a vehicle, or issue a new driver link (`resetLink`). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFleetOwner(request)
  if ("error" in ctx) return ctx.error
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 })

  let body: { name?: unknown; plate?: unknown; kind?: unknown; resetLink?: unknown } | null = null
  try {
    body = await request.json()
  } catch {}

  const update: Record<string, unknown> = {}
  if (typeof body?.name === "string" && body.name.trim()) update.name = body.name.trim().slice(0, 60)
  if (typeof body?.plate === "string") update.plate = body.plate.trim().slice(0, 20) || null
  const kind = VEHICLE_KINDS.find((k) => k === body?.kind)
  if (kind) update.kind = kind

  let token: string | undefined
  if (body?.resetLink === true) {
    token = newDriverToken()
    update.driver_token_hash = hashToken(token)
    // A new link cuts off the old phone: forget its last position too.
    Object.assign(update, { last_lat: null, last_lng: null, last_speed: null, last_heading: null, last_seen: null })
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 })
  }

  const { data, error } = await ctx.admin
    .from("fleet_vehicles")
    .update(update)
    .eq("id", id)
    .eq("owner_id", ctx.user.id)
    .select(VEHICLE_COLUMNS)
    .maybeSingle()

  if (error) return NextResponse.json({ error: "Could not update the vehicle." }, { status: 502 })
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 })
  return NextResponse.json({ vehicle: data, ...(token ? { driverToken: token } : {}) })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFleetOwner(request)
  if ("error" in ctx) return ctx.error
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const { error } = await ctx.admin.from("fleet_vehicles").delete().eq("id", id).eq("owner_id", ctx.user.id)
  if (error) return NextResponse.json({ error: "Could not remove the vehicle." }, { status: 502 })
  return NextResponse.json({ ok: true })
}
