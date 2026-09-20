// lib/supabase/account-data.ts
//
// Pure Supabase queries for saved places + recent searches (Phase 2,
// docs/USER_ACCOUNTS.md). Framework-free by design — the React glue
// (SWR caching, optimistic updates, the localStorage fallback for
// signed-out visitors) lives in hooks/use-account-data.ts and
// hooks/use-saved-places.ts / use-recent-searches.ts. Every function
// here trusts Postgres RLS (auth.uid() = user_id — see
// supabase/migrations/0002_saved_places_recent_searches.sql) as the
// real access control; the userId param just builds the row to
// write, the same way a client could never fake it past RLS anyway.

import type { SupabaseClient } from "@supabase/supabase-js"

export type SavedPlaceKind = "favorite" | "home" | "work"

export interface SavedPlaceInput {
  name: string
  address: string
  lat: number
  lng: number
}

export interface SavedPlaceRow extends SavedPlaceInput {
  id: string
  kind: SavedPlaceKind
  created_at: string
}

export interface RecentSearchInput {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: string | null
}

export interface RecentSearchRow extends RecentSearchInput {
  id: string
  searched_at: string
}

// Hard ceiling regardless of tier — mirrors HARD_CAP in the
// pre-Phase-2 hooks/use-recent-searches.ts.
export const RECENT_SEARCHES_HARD_CAP = 50

const SAVED_PLACE_COLUMNS = "id, kind, name, address, lat, lng, created_at"
const RECENT_SEARCH_COLUMNS =
  "id, place_id, name, address, lat, lng, type, searched_at"

export async function fetchSavedPlaces(
  supabase: SupabaseClient,
  userId: string
): Promise<SavedPlaceRow[]> {
  const { data, error } = await supabase
    .from("saved_places")
    .select(SAVED_PLACE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as SavedPlaceRow[]
}

export async function insertFavorite(
  supabase: SupabaseClient,
  userId: string,
  place: SavedPlaceInput
): Promise<SavedPlaceRow> {
  const { data, error } = await supabase
    .from("saved_places")
    .insert({ user_id: userId, kind: "favorite", ...place })
    .select(SAVED_PLACE_COLUMNS)
    .single()
  if (error) throw error
  return data as SavedPlaceRow
}

export async function deleteFavoriteByCoords(
  supabase: SupabaseClient,
  userId: string,
  lat: number,
  lng: number
): Promise<void> {
  const { error } = await supabase
    .from("saved_places")
    .delete()
    .eq("user_id", userId)
    .eq("kind", "favorite")
    .eq("lat", lat)
    .eq("lng", lng)
  if (error) throw error
}

export async function upsertHomeOrWork(
  supabase: SupabaseClient,
  userId: string,
  kind: "home" | "work",
  place: SavedPlaceInput
): Promise<SavedPlaceRow> {
  // At most one home/work row per user (see the partial unique index
  // in the migration) — delete-then-insert instead of a real upsert,
  // since supabase-js's upsert() takes plain column names and can't
  // target a partial unique index's WHERE clause as its conflict key.
  const { error: deleteError } = await supabase
    .from("saved_places")
    .delete()
    .eq("user_id", userId)
    .eq("kind", kind)
  if (deleteError) throw deleteError

  const { data, error } = await supabase
    .from("saved_places")
    .insert({ user_id: userId, kind, ...place })
    .select(SAVED_PLACE_COLUMNS)
    .single()
  if (error) throw error
  return data as SavedPlaceRow
}

/**
 * One-time copy of a browser's localStorage saved places into a
 * freshly signed-in user's account — see "Migration of existing
 * local data" in docs/USER_ACCOUNTS.md. Callers only invoke this
 * after confirming the account's saved_places is empty, so a plain
 * insert is enough; a unique-violation (Postgres code 23505) just
 * means a second tab imported the same local data concurrently, and
 * is safe to ignore rather than treat as a failure.
 */
export async function importLocalSavedPlaces(
  supabase: SupabaseClient,
  userId: string,
  local: {
    favorites: SavedPlaceInput[]
    home: SavedPlaceInput | null
    work: SavedPlaceInput | null
  }
): Promise<void> {
  const rows: Array<
    SavedPlaceInput & { user_id: string; kind: SavedPlaceKind }
  > = local.favorites.map((f) => ({
    user_id: userId,
    kind: "favorite" as const,
    ...f,
  }))
  if (local.home) rows.push({ user_id: userId, kind: "home", ...local.home })
  if (local.work) rows.push({ user_id: userId, kind: "work", ...local.work })
  if (rows.length === 0) return

  const { error } = await supabase.from("saved_places").insert(rows)
  if (error && (error as { code?: string }).code !== "23505") throw error
}

export async function fetchRecentSearches(
  supabase: SupabaseClient,
  userId: string,
  limit: number = RECENT_SEARCHES_HARD_CAP
): Promise<RecentSearchRow[]> {
  const { data, error } = await supabase
    .from("recent_searches")
    .select(RECENT_SEARCH_COLUMNS)
    .eq("user_id", userId)
    .order("searched_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as RecentSearchRow[]
}

/**
 * Insert a recent search, moving an existing entry for the same
 * place to the front instead of duplicating it (mirrors the
 * localStorage hook's dedup-by-id), then trims to `limit` — Postgres
 * has no built-in "keep newest N rows per user".
 */
export async function addRecentSearchRow(
  supabase: SupabaseClient,
  userId: string,
  entry: RecentSearchInput,
  limit: number
): Promise<void> {
  await supabase
    .from("recent_searches")
    .delete()
    .eq("user_id", userId)
    .eq("place_id", entry.place_id)

  const { error } = await supabase
    .from("recent_searches")
    .insert({ user_id: userId, ...entry })
  if (error) throw error

  const { data: all, error: listError } = await supabase
    .from("recent_searches")
    .select("id")
    .eq("user_id", userId)
    .order("searched_at", { ascending: false })
  if (listError) throw listError

  const overflowIds = (all ?? []).slice(limit).map((row) => row.id as string)
  if (overflowIds.length > 0) {
    await supabase.from("recent_searches").delete().in("id", overflowIds)
  }
}
