"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getTierLimits } from "@/lib/premium"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/client"
import { useSession } from "@/hooks/use-session"
import { toast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import {
  useSavedPlacesData,
  setSavedPlacesCache,
  revalidateSavedPlaces,
} from "@/hooks/use-account-data"
import {
  deleteFavoriteByCoords,
  importLocalSavedPlaces,
  insertFavorite,
  upsertHomeOrWork,
  type SavedPlaceRow,
} from "@/lib/supabase/account-data"

/* Signed-out visitors keep favorites/home/work in this browser's own
   localStorage, same as before accounts existed — see "Auth is
   additive" in docs/USER_ACCOUNTS.md. Signed-in visitors get the
   same shape backed by Supabase instead (see rowsToState below);
   this file is the only thing that knows which one is in play, so
   every consumer (app/app/page.tsx, etc.) is unchanged either way. */
const STORAGE_KEY = "lincoln-nav:saved-places"

// Whether this browser has already been asked (and answered) about
// importing its localStorage places into a newly signed-in account.
// Deliberately separate from STORAGE_KEY so a signed-in user who
// declines still keeps their pre-existing local data untouched.
const IMPORT_STATUS_KEY = "lincoln-nav:saved-places:import-status"

export interface SavedPlaceInput {
  name: string
  address: string
  lat: number
  lng: number
}

export interface SavedPlaceEntry extends SavedPlaceInput {
  id: string
}

interface StoredState {
  favorites: SavedPlaceEntry[]
  home: SavedPlaceEntry | null
  work: SavedPlaceEntry | null
}

const EMPTY_STATE: StoredState = { favorites: [], home: null, work: null }

// Coordinates are the identity here (search results don't carry a
// stable id all the way through to the location-details panel), so
// two selections of "the same place" collapse to one favorite. Also
// used to key remote (Supabase) rows so remote/local ids line up.
function placeId({ lat, lng }: SavedPlaceInput) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`
}

function readStored(): StoredState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STATE
    const parsed = JSON.parse(raw)
    return {
      favorites: Array.isArray(parsed?.favorites) ? parsed.favorites : [],
      home: parsed?.home ?? null,
      work: parsed?.work ?? null,
    }
  } catch {
    return EMPTY_STATE
  }
}

function writeStored(state: StoredState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable — in-memory state still updates
    // for the rest of this session regardless.
  }
}

function readImportStatus(): "imported" | "declined" | null {
  try {
    const raw = window.localStorage.getItem(IMPORT_STATUS_KEY)
    return raw === "imported" || raw === "declined" ? raw : null
  } catch {
    return null
  }
}

function writeImportStatus(status: "imported" | "declined") {
  try {
    window.localStorage.setItem(IMPORT_STATUS_KEY, status)
  } catch {
    // Not critical — worst case this browser gets asked again.
  }
}

function rowsToState(rows: SavedPlaceRow[]): StoredState {
  const favorites: SavedPlaceEntry[] = []
  let home: SavedPlaceEntry | null = null
  let work: SavedPlaceEntry | null = null

  for (const row of rows) {
    const entry: SavedPlaceEntry = {
      id: placeId(row),
      name: row.name,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
    }
    if (row.kind === "favorite") favorites.push(entry)
    else if (row.kind === "home") home = entry
    else work = entry
  }

  return { favorites, home, work }
}

/** Outcome of a toggleFavorite() call, so callers can react. */
export type ToggleFavoriteResult = "added" | "removed" | "limit-reached"

export function useSavedPlaces() {
  const { user } = useSession()
  const signedIn = AUTH_ENABLED && Boolean(user)
  const userId = user?.id ?? null

  const [localState, setLocalState] = useState<StoredState>(EMPTY_STATE)
  const { data: remoteRows } = useSavedPlacesData(userId)
  const importOfferedRef = useRef(false)

  const state = signedIn ? rowsToState(remoteRows ?? []) : localState

  // Recomputed on each render; the entitlement cookie can change
  // between renders (payment, expiry, focus refresh elsewhere).
  const favoritesLimit = getTierLimits().savedPlaces
  const atFavoritesLimit = state.favorites.length >= favoritesLimit

  // Signed-out: client-only read on mount, same as always — avoids
  // an SSR/client hydration mismatch since localStorage doesn't
  // exist on the server and differs per visitor anyway.
  useEffect(() => {
    if (signedIn) return
    setLocalState(readStored())
  }, [signedIn])

  // Signed-in, first load only: if the account has no saved places
  // yet but this browser does, offer to copy them over instead of
  // silently discarding either copy — see "Migration of existing
  // local data" in docs/USER_ACCOUNTS.md. importOfferedRef plus the
  // persisted IMPORT_STATUS_KEY both guard against re-prompting on
  // every render/remount/tab.
  useEffect(() => {
    if (!signedIn || !userId || !remoteRows || importOfferedRef.current) return
    importOfferedRef.current = true

    if (remoteRows.length > 0) return
    if (readImportStatus()) return

    const local = readStored()
    const localCount =
      local.favorites.length + (local.home ? 1 : 0) + (local.work ? 1 : 0)
    if (localCount === 0) return

    toast({
      title: "Import your saved places?",
      description: `This browser has ${localCount} saved place${
        localCount === 1 ? "" : "s"
      } from before you signed in. Add ${
        localCount === 1 ? "it" : "them"
      } to your account?`,
      action: (
        <ToastAction
          altText="Import"
          onClick={() => {
            importLocalSavedPlaces(createClient(), userId, local)
              .then(() => {
                writeImportStatus("imported")
                revalidateSavedPlaces(userId)
              })
              .catch((error) => {
                console.error("[use-saved-places] import failed:", error)
              })
          }}
        >
          Import
        </ToastAction>
      ),
      onOpenChange: (open) => {
        if (!open && !readImportStatus()) writeImportStatus("declined")
      },
    })
  }, [signedIn, userId, remoteRows])

  const isFavorite = useCallback(
    (place: SavedPlaceInput) =>
      state.favorites.some((f) => f.id === placeId(place)),
    [state.favorites]
  )

  const toggleFavorite = useCallback(
    (place: SavedPlaceInput): ToggleFavoriteResult => {
      const id = placeId(place)
      const already = state.favorites.some((f) => f.id === id)

      // Free tier is capped (see FREE_LIMITS.savedPlaces). Removing
      // an existing favorite is always allowed; adding a new one
      // past the limit is blocked and reported so the UI can offer
      // an upgrade.
      if (!already && state.favorites.length >= getTierLimits().savedPlaces) {
        return "limit-reached"
      }

      if (signedIn && userId) {
        const supabase = createClient()

        if (already) {
          setSavedPlacesCache(userId, (rows = []) =>
            rows.filter((r) => !(r.kind === "favorite" && placeId(r) === id))
          )
          deleteFavoriteByCoords(supabase, userId, place.lat, place.lng).catch(
            (error) => {
              console.error(
                "[use-saved-places] remove favorite failed:",
                error
              )
              revalidateSavedPlaces(userId)
            }
          )
        } else {
          const optimisticId = `optimistic-${id}`
          const optimisticRow: SavedPlaceRow = {
            id: optimisticId,
            kind: "favorite",
            created_at: new Date().toISOString(),
            ...place,
          }
          setSavedPlacesCache(userId, (rows = []) => [optimisticRow, ...rows])

          insertFavorite(supabase, userId, place)
            .then((row) => {
              setSavedPlacesCache(userId, (rows = []) =>
                rows.map((r) => (r.id === optimisticId ? row : r))
              )
            })
            .catch((error) => {
              console.error("[use-saved-places] add favorite failed:", error)
              revalidateSavedPlaces(userId)
            })
        }

        return already ? "removed" : "added"
      }

      setLocalState((prev) => {
        const exists = prev.favorites.some((f) => f.id === id)
        const favorites = exists
          ? prev.favorites.filter((f) => f.id !== id)
          : [{ ...place, id }, ...prev.favorites]
        const next = { ...prev, favorites }
        writeStored(next)
        return next
      })

      return already ? "removed" : "added"
    },
    [signedIn, userId, state.favorites]
  )

  const removeFavorite = useCallback(
    (id: string) => {
      if (signedIn && userId) {
        const target = state.favorites.find((f) => f.id === id)
        if (!target) return

        setSavedPlacesCache(userId, (rows = []) =>
          rows.filter((r) => !(r.kind === "favorite" && placeId(r) === id))
        )
        deleteFavoriteByCoords(
          createClient(),
          userId,
          target.lat,
          target.lng
        ).catch((error) => {
          console.error("[use-saved-places] remove favorite failed:", error)
          revalidateSavedPlaces(userId)
        })
        return
      }

      setLocalState((prev) => {
        const next = {
          ...prev,
          favorites: prev.favorites.filter((f) => f.id !== id),
        }
        writeStored(next)
        return next
      })
    },
    [signedIn, userId, state.favorites]
  )

  const setHome = useCallback(
    (place: SavedPlaceInput) => {
      if (signedIn && userId) {
        const optimisticRow: SavedPlaceRow = {
          id: "optimistic-home",
          kind: "home",
          created_at: new Date().toISOString(),
          ...place,
        }
        setSavedPlacesCache(userId, (rows = []) => [
          optimisticRow,
          ...rows.filter((r) => r.kind !== "home"),
        ])

        upsertHomeOrWork(createClient(), userId, "home", place)
          .then((row) => {
            setSavedPlacesCache(userId, (rows = []) => [
              row,
              ...rows.filter((r) => r.kind !== "home"),
            ])
          })
          .catch((error) => {
            console.error("[use-saved-places] set home failed:", error)
            revalidateSavedPlaces(userId)
          })
        return
      }

      setLocalState((prev) => {
        const next = { ...prev, home: { ...place, id: placeId(place) } }
        writeStored(next)
        return next
      })
    },
    [signedIn, userId]
  )

  const setWork = useCallback(
    (place: SavedPlaceInput) => {
      if (signedIn && userId) {
        const optimisticRow: SavedPlaceRow = {
          id: "optimistic-work",
          kind: "work",
          created_at: new Date().toISOString(),
          ...place,
        }
        setSavedPlacesCache(userId, (rows = []) => [
          optimisticRow,
          ...rows.filter((r) => r.kind !== "work"),
        ])

        upsertHomeOrWork(createClient(), userId, "work", place)
          .then((row) => {
            setSavedPlacesCache(userId, (rows = []) => [
              row,
              ...rows.filter((r) => r.kind !== "work"),
            ])
          })
          .catch((error) => {
            console.error("[use-saved-places] set work failed:", error)
            revalidateSavedPlaces(userId)
          })
        return
      }

      setLocalState((prev) => {
        const next = { ...prev, work: { ...place, id: placeId(place) } }
        writeStored(next)
        return next
      })
    },
    [signedIn, userId]
  )

  return {
    favorites: state.favorites,
    home: state.home,
    work: state.work,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    setHome,
    setWork,
    /** Max favorites for the current tier (Infinity for premium). */
    favoritesLimit,
    /** True when a free visitor can't add any more favorites. */
    atFavoritesLimit,
  }
}
