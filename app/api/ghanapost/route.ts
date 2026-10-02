import { NextRequest, NextResponse } from "next/server"
import { digitalAddressAt } from "@/lib/ghanapost"

/* GhanaPost GPS digital address for a point — shown in the place panel
   so anyone can read out / copy the code the way GhanaPost's app does.
   Forward lookups ("GA-183-8164" → place) go through /api/geocode. */

// Ghana's bounding box, roughly: no point asking about anywhere else.
const inGhana = (lat: number, lng: number) => lat >= 4.4 && lat <= 11.4 && lng >= -3.5 && lng <= 1.5

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = Number.parseFloat(searchParams.get("lat") ?? "")
  const lng = Number.parseFloat(searchParams.get("lng") ?? "")

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Missing lat+lng." }, { status: 400 })
  }
  if (!inGhana(lat, lng)) {
    return NextResponse.json({ result: null })
  }

  const result = await digitalAddressAt(lat, lng)
  // Addresses for a point don't change; let the CDN keep them a day.
  return NextResponse.json(
    { result },
    { headers: result ? { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } : {} }
  )
}
