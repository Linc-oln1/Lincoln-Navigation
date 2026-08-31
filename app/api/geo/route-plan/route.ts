import { NextRequest, NextResponse } from "next/server"
import { planRoutes } from "@/lib/geo-intelligence/route-intelligence"
import type { VehicleType } from "@/lib/geo-intelligence/types"

/* =========================================================
   ROUTE PLANNING — the "ROUTE INTEL" + scoring stage. Queries
   every configured routing engine (OSRM always; Valhalla /
   GraphHopper when their env vars are set), scores every candidate
   against known hazard corridors + turn complexity + ETA, and
   returns them ranked with a `reasoning` trail per route so the
   "best route" is never a black-box claim.
========================================================= */

const VALID_VEHICLES: VehicleType[] = ["car", "motorcycle", "bus", "walking", "cycling"]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const originLat = Number.parseFloat(searchParams.get("originLat") || "")
  const originLng = Number.parseFloat(searchParams.get("originLng") || "")
  const destLat = Number.parseFloat(searchParams.get("destLat") || "")
  const destLng = Number.parseFloat(searchParams.get("destLng") || "")
  const vehicleParam = (searchParams.get("vehicle") || "car") as VehicleType

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    return NextResponse.json(
      { error: "Missing or invalid originLat/originLng/destLat/destLng." },
      { status: 400 }
    )
  }

  const vehicle = VALID_VEHICLES.includes(vehicleParam) ? vehicleParam : "car"

  try {
    const routes = await planRoutes(
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng },
      vehicle
    )

    if (routes.length === 0) {
      return NextResponse.json(
        { error: "No route found between those points." },
        { status: 404 }
      )
    }

    return NextResponse.json({ routes, best: routes[0] })
  } catch (error) {
    console.error("[geo/route-plan] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Route planning failed." },
      { status: 502 }
    )
  }
}
