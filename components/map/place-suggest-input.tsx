"use client"

// A text box that lists matching Ghana places while you type (same geocoder as
// the main search). Picking one fills the box and hands back its exact
// coordinates, so "Get Directions" doesn't have to guess which place you meant.
// Typing again clears the pick: the parent decides what to do with the text.

import { useEffect, useRef, useState, type ReactNode } from "react"
import { MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { geocode, type GeocodeResult } from "@/lib/geocoding"

interface PlaceSuggestInputProps {
  value: string
  placeholder?: string
  readOnly?: boolean
  className?: string
  /** The user typed. Called for every edit. */
  onTextChange: (text: string) => void
  /** The user chose a suggestion. Coordinates are [lng, lat]. */
  onPick: (name: string, coordinates: [number, number]) => void
  /** Rendered inside the box's relative wrapper, e.g. a "use my location" button. */
  children?: ReactNode
}

const MIN_CHARS = 3
const DEBOUNCE_MS = 350

export function PlaceSuggestInput({
  value,
  placeholder,
  readOnly,
  className,
  onTextChange,
  onPick,
  children,
}: PlaceSuggestInputProps) {
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [open, setOpen] = useState(false)
  // Suggestions are only searched for text the user typed, not text we filled in.
  const [typed, setTyped] = useState("")
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const query = typed.trim()
    if (readOnly || query.length < MIN_CHARS) {
      setResults([])
      return
    }
    const controller = new AbortController()
    requestRef.current?.abort()
    requestRef.current = controller
    const timer = setTimeout(async () => {
      try {
        const found = await geocode(query, { limit: 5, signal: controller.signal })
        if (controller.signal.aborted) return
        setResults(found.slice(0, 5))
        setOpen(found.length > 0)
      } catch {
        /* suggestions are a convenience; "Get Directions" still geocodes the text */
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [typed, readOnly])

  const close = () => {
    setOpen(false)
    setResults([])
    setTyped("")
  }

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        autoComplete="off"
        onChange={(event) => {
          onTextChange(event.target.value)
          setTyped(event.target.value)
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => event.key === "Escape" && close()}
        className={className}
      />
      {children}
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-card shadow-lg"
        >
          {results.map((r) => (
            <li key={r.id} role="option" aria-selected={false}>
              <button
                type="button"
                // mousedown fires before the box loses focus, so the pick isn't lost.
                onMouseDown={(event) => {
                  event.preventDefault()
                  onPick(r.name, [r.lng, r.lat])
                  close()
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-secondary"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">{r.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
