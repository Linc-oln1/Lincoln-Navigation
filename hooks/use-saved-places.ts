"use client"

import { useCallback, useEffect, useState } from "react"

/* Favorites/Home/Work, like recent searches, live in this browser's
   own localStorage — there's no login system in this app, so this
   is genuinely per-visitor: nothing here is shared with, or visible
   to, anyone else. */
const STORAGE_KEY = "lincoln-nav:saved-places"

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
// two selections of "the same place" collapse to one favorite.
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

export function useSavedPlaces() {
  const [state, setState] = useState<StoredState>(EMPTY_STATE)

  // Client-only read on mount, same reasoning as useRecentSearches:
  // avoids an SSR/client hydration mismatch since localStorage
  // doesn't exist on the server and differs per visitor anyway.
  useEffect(() => {
    setState(readStored())
  }, [])

  const isFavorite = useCallback(
    (place: SavedPlaceInput) => state.favorites.some((f) => f.id === placeId(place)),
    [state.favorites]
  )

  const toggleFavorite = useCallback((place: SavedPlaceInput) => {
    setState((prev) => {
      const id = placeId(place)
      const already = prev.favorites.some((f) => f.id === id)
      const favorites = already
        ? prev.favorites.filter((f) => f.id !== id)
        : [{ ...place, id }, ...prev.favorites]
      const next = { ...prev, favorites }
      writeStored(next)
      return next
    })
  }, [])

  const removeFavorite = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, favorites: prev.favorites.filter((f) => f.id !== id) }
      writeStored(next)
      return next
    })
  }, [])

  const setHome = useCallback((place: SavedPlaceInput) => {
    setState((prev) => {
      const next = { ...prev, home: { ...place, id: placeId(place) } }
      writeStored(next)
      return next
    })
  }, [])

  const setWork = useCallback((place: SavedPlaceInput) => {
    setState((prev) => {
      const next = { ...prev, work: { ...place, id: placeId(place) } }
      writeStored(next)
      return next
    })
  }, [])

  return {
    favorites: state.favorites,
    home: state.home,
    work: state.work,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    setHome,
    setWork,
  }
}
