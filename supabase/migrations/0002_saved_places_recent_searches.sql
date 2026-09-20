-- 0002_saved_places_recent_searches.sql
-- Phase 2 of the user-accounts work (docs/USER_ACCOUNTS.md): synced
-- saved places (favorites/home/work) and recent searches, replacing
-- localStorage for signed-in users.

create extension if not exists pgcrypto;

create table if not exists public.saved_places (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('favorite', 'home', 'work')),
  name        text not null,
  address     text not null,
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now()
);

alter table public.saved_places enable row level security;

create policy "saved_places are owner-readable"
  on public.saved_places for select
  using (auth.uid() = user_id);

create policy "saved_places are owner-insertable"
  on public.saved_places for insert
  with check (auth.uid() = user_id);

create policy "saved_places are owner-deletable"
  on public.saved_places for delete
  using (auth.uid() = user_id);

-- No update policy: the app always replaces a saved place by
-- deleting and re-inserting (see upsertHomeOrWork in
-- lib/supabase/account-data.ts) rather than editing rows in place.

create index if not exists saved_places_user_id_idx
  on public.saved_places (user_id);

-- At most one home and one work row per user.
create unique index if not exists saved_places_home_work_unique
  on public.saved_places (user_id, kind)
  where kind in ('home', 'work');

-- Toggling the same coordinates twice should add/remove one row, not
-- pile up duplicates — mirrors the localStorage hook's lat/lng-keyed
-- dedup (see placeId() in hooks/use-saved-places.ts).
create unique index if not exists saved_places_favorite_unique
  on public.saved_places (user_id, lat, lng)
  where kind = 'favorite';

create table if not exists public.recent_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- The search result's own id from the geocoder (e.g. "mapbox-..."
  -- / "osm-...", see lib/geocode + docs/geocoding-mapbox) — kept
  -- separately from this row's own uuid `id` so re-searching the
  -- same place can be de-duped the same way the localStorage hook
  -- already does, by moving it to the front instead of duplicating.
  place_id    text not null,
  name        text not null,
  address     text not null,
  lat         double precision not null,
  lng         double precision not null,
  type        text,
  searched_at timestamptz not null default now()
);

alter table public.recent_searches enable row level security;

create policy "recent_searches are owner-readable"
  on public.recent_searches for select
  using (auth.uid() = user_id);

create policy "recent_searches are owner-insertable"
  on public.recent_searches for insert
  with check (auth.uid() = user_id);

create policy "recent_searches are owner-deletable"
  on public.recent_searches for delete
  using (auth.uid() = user_id);

create index if not exists recent_searches_user_id_searched_at_idx
  on public.recent_searches (user_id, searched_at desc);
