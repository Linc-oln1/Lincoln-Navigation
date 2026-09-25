"use client"

// hooks/use-account-data.ts
//
// SWR-backed reads of a signed-in user's saved places + recent
// searches (Phase 2, docs/USER_ACCOUNTS.md). hooks/use-saved-places.ts
// and hooks/use-recent-searches.ts are the hooks the rest of the app
// actually calls — both delegate here when a user is signed in, and
// fall back to their existing localStorage path otherwise. SWR
// (rather than plain useState+useEffect in each of those two hooks)
// specifically because they both need the SAME signed-in user's
// data: keying on userId lets SWR dedupe that into one shared fetch
// instead of two independent ones.

import useSWR, { mutate as globalMutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import {
  fetchRecentSearches,
  fetchSavedPlaces,
  RECENT_SEARCHES_HARD_CAP,
  type RecentSearchRow,
  type SavedPlaceRow,
} from "@/lib/supabase/account-data"

function savedPlacesKey(userId: string) {
  return ["account-data:saved-places", userId] as const
}

function recentSearchesKey(userId: string) {
  return ["account-data:recent-searches", userId] as const
}

// `userId: null` (signed out, or auth not configured) passes a
// falsy key to useSWR, which pauses the hook entirely — no request,
// `data` stays undefined — so this costs nothing when auth is off.
export function useSavedPlacesData(userId: string | null) {
  return useSWR(userId ? savedPlacesKey(userId) : null, ([, id]) =>
    fetchSavedPlaces(createClient(), id)
  )
}

export function useRecentSearchesData(userId: string | null) {
  return useSWR(userId ? recentSearchesKey(userId) : null, ([, id]) =>
    fetchRecentSearches(createClient(), id, RECENT_SEARCHES_HARD_CAP)
  )
}

/**
 * Update the cached saved-places list for `userId` without waiting
 * on a round trip — the "write-through" part of the write-through
 * cache principle in docs/USER_ACCOUNTS.md. `revalidate: false`
 * keeps this purely optimistic; callers re-fetch (via
 * revalidateSavedPlaces) on failure to undo a bad guess.
 */
export function setSavedPlacesCache(
  userId: string,
  updater: (current: SavedPlaceRow[] | undefined) => SavedPlaceRow[]
) {
  return globalMutate(savedPlacesKey(userId), updater, { revalidate: false })
}

export function setRecentSearchesCache(
  userId: string,
  updater: (current: RecentSearchRow[] | undefined) => RecentSearchRow[]
) {
  return globalMutate(recentSearchesKey(userId), updater, {
    revalidate: false,
  })
}

/** Re-fetch from Supabase, discarding any optimistic guess. */
export function revalidateSavedPlaces(userId: string) {
  return globalMutate(savedPlacesKey(userId))
}

export function revalidateRecentSearches(userId: string) {
  return globalMutate(recentSearchesKey(userId))
}
