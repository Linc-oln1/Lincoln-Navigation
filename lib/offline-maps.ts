// lib/offline-maps.ts  (browser only)
//
// Offline maps (Premium): saves the street map for an area into the
// browser's Cache Storage so the map still draws with no connection.
//
// What is saved for an area ("region"):
//   - the OpenFreeMap style, its tile index, icons (sprite) and label fonts,
//   - vector tiles for every zoom from 0 up to the chosen detail level,
//   - the low-zoom shaded-relief raster tiles.
// The service worker (public/sw.js) answers requests for these from the
// saved copy first, so they work with no network at all.
//
// Not saved: satellite / terrain layers, search, directions, traffic,
// weather and place lookups — those still need a connection.
//
// Each region lives in its own cache, "ln-offline-<id>", so deleting a
// region is just deleting that cache. The list of regions (name, size,
// date) is kept in localStorage.

export type BBox = [south: number, west: number, north: number, east: number]

export interface OfflineRegion {
  id: string
  name: string
  bbox: BBox
  maxZoom: number
  tiles: number
  bytes: number
  savedAt: string
}

export interface RegionPreset {
  id: string
  name: string
  bbox: BBox
  /** Highest zoom this preset saves at "standard" detail. */
  overviewOnly?: boolean
}

// Keep in step with the base style in components/map/map-view.tsx.
export const OFM_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"
const TILEJSON_FALLBACK = "https://tiles.openfreemap.org/planet"
const RELIEF_TILE_URL = "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png"
const RELIEF_MAX_ZOOM = 6
const GLYPH_RANGES = ["0-255", "256-511"] // Latin + accents: all Ghana place names
const CACHE_PREFIX = "ln-offline-"
const REGISTRY_KEY = "ln_offline_regions"
const CONCURRENCY = 6

/** Refuse anything bigger — protects the phone's storage and OpenFreeMap. */
export const MAX_TILES = 3000

export const STANDARD_MAX_ZOOM = 14
export const OVERVIEW_MAX_ZOOM = 10

/** Ready-made areas (south, west, north, east). */
export const PRESETS: RegionPreset[] = [
  { id: "accra", name: "Accra & Tema", bbox: [5.5, -0.3, 5.72, 0.06] },
  { id: "kumasi", name: "Kumasi", bbox: [6.62, -1.7, 6.78, -1.54] },
  { id: "takoradi", name: "Takoradi & Sekondi", bbox: [4.86, -1.82, 5.0, -1.66] },
  { id: "capecoast", name: "Cape Coast & Elmina", bbox: [5.06, -1.38, 5.18, -1.2] },
  { id: "tamale", name: "Tamale", bbox: [9.34, -0.9, 9.5, -0.76] },
  { id: "ghana", name: "Ghana overview", bbox: [4.7, -3.3, 11.2, 1.3], overviewOnly: true },
]

/* ------------------------------ tile maths ------------------------------ */

function lngToX(lng: number, z: number) {
  return Math.floor(((lng + 180) / 360) * 2 ** z)
}

function latToY(lat: number, z: number) {
  const rad = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * 2 ** z)
}

interface TileRange {
  z: number
  x0: number
  x1: number
  y0: number
  y1: number
}

function rangesFor(bbox: BBox, maxZoom: number): TileRange[] {
  const [south, west, north, east] = bbox
  const out: TileRange[] = []
  for (let z = 0; z <= maxZoom; z++) {
    const limit = 2 ** z - 1
    out.push({
      z,
      x0: Math.max(0, lngToX(west, z)),
      x1: Math.min(limit, lngToX(east, z)),
      y0: Math.max(0, latToY(north, z)),
      y1: Math.min(limit, latToY(south, z)),
    })
  }
  return out
}

function countTiles(ranges: TileRange[]) {
  return ranges.reduce((n, r) => n + (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1), 0)
}

/** Rough on-device size per zoom level (KB per tile; low zooms include the relief raster). Measured on Cape Coast; cities run larger. */
const KB_PER_TILE = [200, 200, 350, 300, 150, 120, 60, 40, 35, 35, 35, 30, 30, 30, 50]

export function estimateRegion(bbox: BBox, maxZoom: number) {
  const ranges = rangesFor(bbox, maxZoom)
  const tiles = countTiles(ranges)
  const kb = ranges.reduce(
    (sum, r) => sum + (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) * (KB_PER_TILE[r.z] ?? 170),
    0
  )
  return { tiles, bytes: Math.round(kb * 1024) }
}

/* -------------------------------- registry ------------------------------- */

export function isOfflineMapsSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window && "serviceWorker" in navigator
}

export function listRegions(): OfflineRegion[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRegions(regions: OfflineRegion[]) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(regions))
  } catch {}
}

export async function deleteRegion(id: string) {
  await caches.delete(CACHE_PREFIX + id)
  saveRegions(listRegions().filter((r) => r.id !== id))
}

/* ------------------------------- downloading ------------------------------ */

export interface DownloadProgress {
  done: number
  total: number
  bytes: number
}

export class OfflineDownloadError extends Error {
  constructor(public code: "too-large" | "failed" | "aborted", message?: string) {
    super(message ?? code)
  }
}

function collectFonts(value: unknown, into: Set<string>) {
  if (Array.isArray(value)) {
    if (value[0] === "literal" && Array.isArray(value[1])) {
      for (const f of value[1]) if (typeof f === "string") into.add(f)
    }
    for (const v of value) collectFonts(v, into)
  } else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (key === "text-font" && Array.isArray(v)) {
        for (const f of v) if (typeof f === "string") into.add(f)
      }
      collectFonts(v, into)
    }
  }
}

async function fetchOk(url: string, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new OfflineDownloadError("failed", `${res.status} ${url}`)
  return res
}

/** Store a copy under its URL; returns its size in bytes. */
async function putCopy(cache: Cache, url: string, res: Response): Promise<number> {
  const body = await res.arrayBuffer()
  const headers = new Headers()
  const type = res.headers.get("content-type")
  if (type) headers.set("Content-Type", type)
  await cache.put(url, new Response(body, { status: 200, headers }))
  return body.byteLength
}

export async function downloadRegion(
  input: { id: string; name: string; bbox: BBox; maxZoom: number },
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<OfflineRegion> {
  const ranges = rangesFor(input.bbox, input.maxZoom)
  const tileCount = countTiles(ranges)
  if (tileCount > MAX_TILES) throw new OfflineDownloadError("too-large")

  const cacheName = CACHE_PREFIX + input.id
  await caches.delete(cacheName) // an "update" starts clean
  const cache = await caches.open(cacheName)

  try {
    let bytes = 0

    // 1. Style → tile index → icons and fonts.
    const styleRes = await fetchOk(OFM_STYLE_URL, signal)
    const style = await styleRes.clone().json()
    bytes += await putCopy(cache, OFM_STYLE_URL, styleRes)

    const tileJsonUrl: string = style.sources?.openmaptiles?.url ?? TILEJSON_FALLBACK
    const tileJsonRes = await fetchOk(tileJsonUrl, signal)
    const tileJson = await tileJsonRes.clone().json()
    bytes += await putCopy(cache, tileJsonUrl, tileJsonRes)

    const vectorTemplate: string | undefined = tileJson.tiles?.[0]
    if (!vectorTemplate) throw new OfflineDownloadError("failed", "no tile template")
    const vectorMaxZoom: number = tileJson.maxzoom ?? 14

    const extras: string[] = []
    if (typeof style.sprite === "string") {
      for (const suffix of [".json", ".png", "@2x.json", "@2x.png"]) extras.push(style.sprite + suffix)
    }
    if (typeof style.glyphs === "string") {
      const fonts = new Set<string>()
      collectFonts(style.layers, fonts)
      for (const font of fonts) {
        for (const range of GLYPH_RANGES) {
          extras.push(style.glyphs.replace("{fontstack}", encodeURIComponent(font)).replace("{range}", range))
        }
      }
    }

    // 2. Everything else, fetched a few at a time.
    const jobs: string[] = [...extras]
    for (const r of ranges) {
      for (let x = r.x0; x <= r.x1; x++) {
        for (let y = r.y0; y <= r.y1; y++) {
          if (r.z <= vectorMaxZoom) {
            jobs.push(vectorTemplate.replace("{z}", String(r.z)).replace("{x}", String(x)).replace("{y}", String(y)))
          }
          if (r.z <= RELIEF_MAX_ZOOM) {
            jobs.push(RELIEF_TILE_URL.replace("{z}", String(r.z)).replace("{x}", String(x)).replace("{y}", String(y)))
          }
        }
      }
    }

    let done = 0
    let cursor = 0
    const total = jobs.length
    onProgress({ done, total, bytes })

    const worker = async () => {
      while (cursor < jobs.length) {
        if (signal?.aborted) throw new OfflineDownloadError("aborted")
        const url = jobs[cursor++]
        try {
          const res = await fetch(url, { signal })
          // Empty tiles (open sea, no data) come back 204/404 — nothing to keep.
          if (res.ok && res.status === 200) bytes += await putCopy(cache, url, res)
        } catch (error) {
          if (signal?.aborted) throw new OfflineDownloadError("aborted")
          // One failed tile isn't fatal, but a dead connection is: bail out
          // after several misses in a row rather than saving a broken area.
          if (++misses > 12) throw new OfflineDownloadError("failed", String(error))
          continue
        }
        misses = 0
        done++
        onProgress({ done, total, bytes })
      }
    }
    let misses = 0
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))

    const region: OfflineRegion = {
      id: input.id,
      name: input.name,
      bbox: input.bbox,
      maxZoom: input.maxZoom,
      tiles: tileCount,
      bytes,
      savedAt: new Date().toISOString(),
    }
    saveRegions([...listRegions().filter((r) => r.id !== region.id), region])
    return region
  } catch (error) {
    await caches.delete(cacheName)
    if (error instanceof OfflineDownloadError) throw error
    if (signal?.aborted) throw new OfflineDownloadError("aborted")
    throw new OfflineDownloadError("failed", String(error))
  }
}

/** Ask the browser not to evict saved maps when it needs space. */
export async function requestPersistentStorage() {
  try {
    await navigator.storage?.persist?.()
  } catch {}
}

export async function storageUsage(): Promise<{ used: number; quota: number } | null> {
  try {
    const est = await navigator.storage?.estimate?.()
    if (est?.usage != null && est.quota != null) return { used: est.usage, quota: est.quota }
  } catch {}
  return null
}
