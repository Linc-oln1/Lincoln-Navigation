"use client"

import { useCallback, useEffect, useState } from "react"

/* Recent searches are stored in this browser's own localStorage —
   there's no login system in this app, so "per user" here means
   per device: nothing written here is ever visible to anyone else,
   and nothing from anyone else's device shows up here. */
const STORAGE_KEY = "lincoln-nav:recent-searches"
const MAX_RECENT = 5

export interface RecentSearchEntry {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: string
}

function readStored(): RecentSearchEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Corrupt JSON, or localStorage unavailable (private browsing,
    // storage disabled) — just start with an empty list.
    return []
  }
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([])

  // Read on mount only, client-side — avoids a server/client
  // hydration mismatch, since localStorage doesn't exist on the
  // server and differs per visitor anyway.
  useEffect(() => {
    setRecentSearches(readStored())
  }, [])

  const addRecentSearch = useCallback((entry: RecentSearchEntry) => {
    setRecentSearches((prev) => {
      const next = [entry, ...prev.filter((p) => p.id !== entry.id)].slice(0, MAX_RECENT)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Storage full or unavailable — the in-memory list above
        // still updates for the rest of this session regardless.
      }
      return next
    })
  }, [])

  return { recentSearches, addRecentSearch }
}
