import { NextRequest, NextResponse } from "next/server"
import { resolveRelativeLandmark } from "@/lib/geo-intelligence/ghana-landmarks"

/* =========================================================
   LOCAL KNOWLEDGE — resolves landmark-relative descriptions
   ("opposite the old filling station", "behind the MTN office")
   into a location estimate with an explicit uncertainty radius.
   `areaLat`/`areaLng` anchor the search to the town/neighborhood
   the user already specified (see ghana-landmarks.ts for why this
   endpoint deliberately does not guess that part).
========================================================= */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const description = searchParams.get("q")?.trim()
  const areaLat = Number.parseFloat(searchParams.get("areaLat") || "")
  const areaLng = Number.parseFloat(searchParams.get("areaLng") || "")

  if (!description) {
    return NextResponse.json({ error: "Missing q (the landmark description)." }, { status: 400 })
  }

  if (!Number.isFinite(areaLat) || !Number.isFinite(areaLng)) {
    return NextResponse.json(
      { error: "Missing or invalid areaLat/areaLng (the town/neighborhood to search within)." },
      { status: 400 }
    )
  }

  try {
    const result = await resolveRelativeLandmark(description, { lat: areaLat, lng: areaLng })

    if (!result) {
      return NextResponse.json(
        { error: "Could not identify a landmark anchor in that description." },
        { status: 404 }
      )
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error("[geo/landmark] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Landmark resolution failed." },
      { status: 502 }
    )
  }
}
