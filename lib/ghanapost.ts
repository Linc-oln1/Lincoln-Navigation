// lib/ghanapost.ts
//
// GhanaPost GPS digital addresses ("GA-183-8164") — the national
// addressing system most Ghanaians actually give out instead of a
// street address. Server-only: called from /api/geocode (forward) and
// /api/ghanapost (reverse, for the place panel).
//
// GhanaPost's own API needs partner credentials, so this uses the free
// community proxy at ghanapostgps.sperixlabs.org by default (override
// with GHANAPOST_GPS_URL). It's an upgrade, never a requirement: every
// failure resolves to null and search falls through to Mapbox/OSM.

export interface DigitalAddress {
  /** Formatted, e.g. "GA-183-8164". */
  code: string
  lat: number
  lng: number
  street?: string
  area?: string
  district?: string
  region?: string
}

// Region/district prefix (2–3 chars: "GA", "G4", "AKW"), then 3–5
// digits, then 4 digits. Separators optional: "GA1838164",
// "ga 183 8164", "GA-183-8164" all match.
const DIGITAL_ADDRESS_RE = /^\s*([A-Z][A-Z0-9][A-Z]?)[\s-]*(\d{3,5})[\s-]*(\d{4})\s*$/i

/** Normalises a typed digital address to "GA-183-8164", or null if it isn't one. */
export function parseDigitalAddress(input: string): string | null {
  const match = DIGITAL_ADDRESS_RE.exec(input)
  if (!match) return null
  return `${match[1].toUpperCase()}-${match[2]}-${match[3]}`
}

/* The API returns the code unformatted ("GA1838164", "AKW4849321")
   alongside its PostCode ("GA183", "AKW484" = prefix + area digits).
   The postcode marks where the last group starts; its leading letters
   are the prefix (or letter + digit, as in "G4059"). */
function formatCode(raw: string, postCode?: string): string {
  const code = raw.replace(/[\s-]/g, "").toUpperCase()
  const post = postCode?.toUpperCase()
  const end = post && code.startsWith(post) ? post.length : code.length - 4
  const letters = /^[A-Z]+/.exec(code)?.[0].length ?? 0
  const prefix = Math.min(Math.max(letters, 2), end - 3)
  return `${code.slice(0, prefix)}-${code.slice(prefix, end)}-${code.slice(end)}`
}

/* Missing streets come back as "[UNKNOWN]", or "[UNKNOWN] [NEAR] Kumasi
   - Techiman" for the nearest road. */
function cleanStreet(street?: string): string | undefined {
  if (!street) return undefined
  const cleaned = street
    .replace(/\[UNKNOWN\]/gi, "")
    .replace(/\[NEAR\]/gi, "near")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned || undefined
}

function baseUrl(): string {
  const configured = process.env.GHANAPOST_GPS_URL?.trim()
  return (configured || "https://ghanapostgps.sperixlabs.org").replace(/\/+$/, "")
}

/* The community proxy occasionally drops a request or answers
   found:false for a valid code, so a miss gets one retry. */
async function post(path: string, body: Record<string, string>): Promise<any | null> {
  return (await postOnce(path, body)) ?? (await postOnce(path, body))
}

async function postOnce(path: string, body: Record<string, string>): Promise<any | null> {
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data?.found ? data.data?.Table?.[0] ?? null : null
  } catch (error) {
    console.warn("[ghanapost] lookup failed:", error)
    return null
  }
}

const num = (value: unknown) => (typeof value === "number" ? value : Number.parseFloat(String(value)))

/** Digital address → location. */
export async function lookupDigitalAddress(code: string): Promise<DigitalAddress | null> {
  const row = await post("/get-location", { address: code })
  if (!row) return null
  const lat = num(row.CenterLatitude)
  const lng = num(row.CenterLongitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    code: formatCode(row.GPSName || code, row.PostCode),
    lat,
    lng,
    street: cleanStreet(row.Street),
    area: row.Area || undefined,
    district: row.District || undefined,
    region: row.Region || undefined,
  }
}

/** Location → digital address (the 5 m grid square containing it). */
export async function digitalAddressAt(lat: number, lng: number): Promise<DigitalAddress | null> {
  const row = await post("/get-address", { lat: String(lat), long: String(lng) })
  if (!row?.GPSName) return null
  return {
    code: formatCode(row.GPSName, row.PostCode),
    lat,
    lng,
    street: cleanStreet(row.Street),
    area: row.Area || undefined,
    district: row.District || undefined,
    region: row.Region || undefined,
  }
}
