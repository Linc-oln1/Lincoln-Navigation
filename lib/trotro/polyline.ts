import type { LatLng } from "./types"

/** Decodes a Google-style encoded polyline (precision 5). */
export function decodePolyline(encoded: string): LatLng[] {
  const out: LatLng[] = []
  let i = 0, lat = 0, lng = 0
  while (i < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, byte: number
      do {
        byte = encoded.charCodeAt(i++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (axis === 0) lat += delta
      else lng += delta
    }
    out.push([lat / 1e5, lng / 1e5])
  }
  return out
}
