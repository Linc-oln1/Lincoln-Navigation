"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, MapPin, Clock, Star, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { geocode, type GeocodeResult } from "@/lib/geocoding"

/*
 * PREVIOUSLY: this component called nominatim.openstreetmap.org
 * directly from the browser (no identifying User-Agent, against
 * Nominatim's usage policy), restricted every search to
 * "&countrycodes=gh" (so nowhere outside Ghana could ever be
 * found), and had no request cancellation — typing quickly could
 * let an older, slower response overwrite a newer one on screen.
 *
 * NOW: search goes through our own /api/geocode proxy (via
 * lib/geocoding.ts), Ghana is a ranking bias rather than a wall,
 * and in-flight requests are cancelled when the query changes.
 */

interface SearchResult {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: string
}

interface SearchPanelProps {
  onSelectLocation: (result: SearchResult) => void
  isOpen: boolean
  onClose: () => void
}

// Popular places in Ghana
const POPULAR_PLACES: SearchResult[] = [
  { id: "1", name: "Kotoka International Airport", address: "Airport Residential Area, Accra", lat: 5.6052, lng: -0.1668, type: "Airport" },
  { id: "2", name: "Independence Square", address: "Independence Avenue, Accra", lat: 5.5483, lng: -0.2087, type: "Landmark" },
  { id: "3", name: "Kwame Nkrumah Mausoleum", address: "Accra Central", lat: 5.5488, lng: -0.2115, type: "Memorial" },
  { id: "4", name: "Cape Coast Castle", address: "Cape Coast", lat: 5.1033, lng: -1.2416, type: "Historic Site" },
  { id: "5", name: "Kakum National Park", address: "Central Region", lat: 5.3500, lng: -1.3833, type: "Nature" },
  { id: "6", name: "Elmina Castle", address: "Elmina", lat: 5.0848, lng: -1.3489, type: "Historic Site" },
  { id: "7", name: "University of Ghana", address: "Legon, Accra", lat: 5.6508, lng: -0.1869, type: "University" },
  { id: "8", name: "Accra Mall", address: "Spintex Road, Accra", lat: 5.6207, lng: -0.1174, type: "Shopping" },
  { id: "9", name: "Kumasi Central Market", address: "Kumasi", lat: 6.6885, lng: -1.6244, type: "Market" },
  { id: "10", name: "Mole National Park", address: "Northern Region", lat: 9.2667, lng: -1.8500, type: "Nature" },
]

const RECENT_SEARCHES: SearchResult[] = [
  { id: "r1", name: "Osu Oxford Street", address: "Osu, Accra", lat: 5.5571, lng: -0.1818, type: "Street" },
  { id: "r2", name: "Labadi Beach", address: "La, Accra", lat: 5.5567, lng: -0.1447, type: "Beach" },
]

function toSearchResult(result: GeocodeResult): SearchResult {
  return {
    id: result.id,
    name: result.name,
    address: result.address,
    lat: result.lat,
    lng: result.lng,
    type: result.type,
  }
}

export function SearchPanel({ onSelectLocation, isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    // Cancel whatever request is still in flight from a previous
    // keystroke so a slow, stale response can't clobber a newer,
    // faster one.
    abortControllerRef.current?.abort()

    if (query.trim().length < 2) {
      setResults([])
      setShowResults(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const timer = setTimeout(async () => {
      setIsSearching(true)
      setShowResults(true)
      setError(null)

      try {
        const geocoded = await geocode(query, {
          limit: 10,
          signal: controller.signal,
        })

        if (controller.signal.aborted) return

        setResults(geocoded.map(toSearchResult))
      } catch (err) {
        if (controller.signal.aborted) return

        console.error("Search error:", err)

        // Fall back to the local popular-places list so search
        // still does *something* useful if the geocoder is down.
        const localResults = POPULAR_PLACES.filter(
          (place) =>
            place.name.toLowerCase().includes(query.toLowerCase()) ||
            place.address.toLowerCase().includes(query.toLowerCase())
        )

        setResults(localResults)

        if (localResults.length === 0) {
          setError(
            err instanceof Error
              ? err.message
              : "Search is temporarily unavailable."
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, 400)

    return () => {
      clearTimeout(timer)
    }
  }, [query])

  const handleSelect = (result: SearchResult) => {
    onSelectLocation(result)
    setQuery("")
    setShowResults(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-[400px] bg-card/95 backdrop-blur-xl z-[1001] border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search anywhere..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-secondary border-0 focus-visible:ring-primary"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Search Results */}
          {showResults && results.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Search Results
              </h3>
              <div className="space-y-1">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{result.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{result.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results / Error */}
          {showResults && results.length === 0 && !isSearching && query.length >= 2 && (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {error || `No places found for “${query}”`}
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {!showResults && (
            <>
              <div className="mb-6">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Recent
                </h3>
                <div className="space-y-1">
                  {RECENT_SEARCHES.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => handleSelect(place)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{place.name}</p>
                        <p className="text-sm text-muted-foreground">{place.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Places */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star className="w-3 h-3" />
                  Popular in Ghana
                </h3>
                <div className="space-y-1">
                  {POPULAR_PLACES.slice(0, 8).map((place) => (
                    <button
                      key={place.id}
                      onClick={() => handleSelect(place)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{place.name}</p>
                        <p className="text-sm text-muted-foreground">{place.address}</p>
                        {place.type && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-secondary text-muted-foreground rounded">
                            {place.type}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
