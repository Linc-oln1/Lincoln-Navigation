"use client"

// Search-and-pick for a business location (used by /advertise and
// /admin/sponsors). Uses the site's own /api/geocode, and hands back
// the chosen address and coordinates.

import { useState } from "react"
import { Loader2, MapPin, Search } from "lucide-react"
import { geocode, type GeocodeResult } from "@/lib/geocoding"

export interface PickedLocation {
  address: string
  lat: number
  lng: number
}

export function LocationPicker({
  value,
  onChange,
  inputClassName,
}: {
  value: PickedLocation | null
  onChange: (v: PickedLocation | null) => void
  inputClassName?: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    if (!query.trim()) return
    setBusy(true)
    setError(null)
    try {
      const found = await geocode(query, { limit: 6 })
      setResults(found)
      if (!found.length) setError("No matches. Try the street and area, e.g. “Oxford St, Osu”.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.")
    } finally {
      setBusy(false)
    }
  }

  if (value) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex min-w-0 gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{value.address}</p>
            <p className="text-xs text-muted-foreground">
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void search()
            }
          }}
          placeholder="Search your business address"
          className={inputClassName}
        />
        <button
          type="button"
          onClick={search}
          disabled={busy}
          aria-label="Search"
          className="flex-shrink-0 rounded-xl border border-border px-3 hover:bg-secondary disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-muted-foreground">{error}</p>}
      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ address: r.address || r.name, lat: r.lat, lng: r.lng })
                  setResults([])
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-secondary"
              >
                <p className="text-sm font-medium">{r.name}</p>
                {r.address && r.address !== r.name && (
                  <p className="text-xs text-muted-foreground">{r.address}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
