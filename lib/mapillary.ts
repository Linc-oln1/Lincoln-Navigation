// lib/mapillary.ts
//
// Street-level imagery from Mapillary (crowd-sourced, CC BY-SA). The feature
// is off until a Mapillary client token is set:
//
//   NEXT_PUBLIC_MAPILLARY_TOKEN   a Mapillary "client token" (public by design)
//
// Get one free at https://www.mapillary.com/dashboard/developers — register an
// application, copy its Client Token, add it in Vercel → Environment Variables
// (all environments) and redeploy. Coverage in Ghana is strong in Accra and
// other large towns and patchy elsewhere; the viewer says so when a spot has
// no photos.

export const MAPILLARY_TOKEN = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN?.trim() || ""
export const STREET_VIEW_ENABLED = Boolean(MAPILLARY_TOKEN)

export interface NearbyImage {
  id: string
  lat: number
  lng: number
  isPano: boolean
  capturedAt: number | null
  distanceM: number
}

function metres(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Mapillary's own limits: a point search reaches at most 50 m; anything wider
// has to be a bounding box (whose area may not exceed 0.01 square degrees).
const POINT_RADIUS_MAX_M = 50

/**
 * Photos within `radius` metres of a point, closest first. Throws on a network
 * or token problem; returns [] when the spot simply has no coverage.
 */
export async function imagesNear(lat: number, lng: number, radius: number, signal?: AbortSignal): Promise<NearbyImage[]> {
  if (!MAPILLARY_TOKEN) return []

  const params = new URLSearchParams({
    access_token: MAPILLARY_TOKEN,
    fields: "id,computed_geometry,is_pano,captured_at",
    limit: "100",
  })
  if (radius <= POINT_RADIUS_MAX_M) {
    params.set("lat", String(lat))
    params.set("lng", String(lng))
    params.set("radius", String(radius))
  } else {
    // A square box around the point, then trimmed to a circle below.
    const dLat = radius / 111_320
    const dLng = radius / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
    params.set("bbox", [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(6)).join(","))
  }
  const res = await fetch(`https://graph.mapillary.com/images?${params}`, { signal })
  if (!res.ok) throw new Error(`Mapillary ${res.status}`)

  const body = (await res.json()) as {
    data?: { id: string; computed_geometry?: { coordinates?: [number, number] }; is_pano?: boolean; captured_at?: number }[]
  }

  return (body.data ?? [])
    .flatMap((img) => {
      const c = img.computed_geometry?.coordinates
      if (!img.id || !c) return []
      return [
        {
          id: String(img.id),
          lat: c[1],
          lng: c[0],
          isPano: Boolean(img.is_pano),
          capturedAt: typeof img.captured_at === "number" ? img.captured_at : null,
          distanceM: metres(lat, lng, c[1], c[0]),
        },
      ]
    })
    .filter((img) => img.distanceM <= radius)
    .sort((a, b) => a.distanceM - b.distanceM)
}

/**
 * The best photo to open first: the closest one, unless a newer or 360° photo
 * is almost as close (within 15 m), since those give a better first view.
 */
export function pickBest(images: NearbyImage[]): NearbyImage | null {
  if (images.length === 0) return null
  const nearest = images[0]
  const close = images.filter((i) => i.distanceM <= nearest.distanceM + 15)
  return (
    close.sort(
      (a, b) => Number(b.isPano) - Number(a.isPano) || (b.capturedAt ?? 0) - (a.capturedAt ?? 0)
    )[0] ?? nearest
  )
}
