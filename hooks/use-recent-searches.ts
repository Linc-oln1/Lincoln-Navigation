"use client"

import { useCallback, useEffect, useState } from "react"
import { getTierLimits } from "@/lib/premium"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/client"
import { useSession } from "@/hooks/use-session"
import {
  useRecentSearchesData,
  setRecentSearchesCache,
  revalidateRecentSearches,
} from "@/hooks/use-account-data"
import {
  addRecentSearchRow,
  RECENT_SEARCHES_HARD_CAP,
  type RecentSearchRow,
} from "@/lib/supabase/account-data"

/* Signed-out visitors keep recent searches in this browser's own
   localStorage, same as before accounts existed. Signed-in visitors
   get the same shape backed by Supabase instead (see rowToEntry
   below) — this file is the only thing that knows which one is in
   play, so components/map/search-panel.tsx is unchanged either way. */
const STORAGE_KEY = "lincoln-nav:recent-searches"
// Free tier keeps a short trip history; premium keeps far more
// ("Unlimited saved places and trip history" on /pricing). See
// FREE_LIMITS / PREMIUM_LIMITS.tripHistory.
const HARD_CAP = RECENT_SEARCHES_HARD_CAP

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

// The DB row's own uuid isn't exposed here — `place_id` (the
// geocoder result's id) plays the role of RecentSearchEntry.id in
// both the local and remote paths, so dedup-by-id behaves the same
// either way.
function rowToEntry(row: RecentSearchRow): RecentSearchEntry {
  return {
    id: row.place_id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    type: row.type ?? undefined,
  }
}

export function useRecentSearches() {
  const { user } = useSession()
  const signedIn = AUTH_ENABLED && Boolean(user)
  const userId = user?.id ?? null

  const [localSearches, setLocalSearches] = useState<RecentSearchEntry[]>([])
  const { data: remoteRows } = useRecentSearchesData(userId)

  // Read on mount only, client-side — avoids a server/client
  // hydration mismatch, since localStorage doesn't exist on the
  // server and differs per visitor anyway.
  useEffect(() => {
    if (signedIn) return
    setLocalSearches(readStored())
  }, [signedIn])

  const recentSearches = signedIn
    ? (remoteRows ?? []).map(rowToEntry)
    : localSearches

  const addRecentSearch = useCallback(
    (entry: RecentSearchEntry) => {
      const limit = Math.min(getTierLimits().tripHistory, HARD_CAP)

      if (signedIn && userId) {
        const optimisticRow: RecentSearchRow = {
          id: `optimistic-${entry.id}`,
          place_id: entry.id,
          name: entry.name,
          address: entry.address,
          lat: entry.lat,
          lng: entry.lng,
          type: entry.type ?? null,
          searched_at: new Date().toISOString(),
        }
        setRecentSearchesCache(userId, (rows = []) =>
          [optimisticRow, ...rows.filter((r) => r.place_id !== entry.id)].slice(
            0,
            limit
          )
        )

        addRecentSearchRow(
          createClient(),
          userId,
          {
            place_id: entry.id,
            name: entry.name,
            address: entry.address,
            lat: entry.lat,
            lng: entry.lng,
            type: entry.type ?? null,
          },
          limit
        ).catch((error) => {
          console.error("[use-recent-searches] add failed:", error)
          revalidateRecentSearches(userId)
        })
        return
      }

      setLocalSearches((prev) => {
        const next = [entry, ...prev.filter((p) => p.id !== entry.id)].slice(
          0,
          limit
        )
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Storage full or unavailable — the in-memory list above
          // still updates for the rest of this session regardless.
        }
        return next
      })
    },
    [signedIn, userId]
  )

  return { recentSearches, addRecentSearch }
}
