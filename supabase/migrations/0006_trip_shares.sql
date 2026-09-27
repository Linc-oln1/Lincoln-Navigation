-- 0006_trip_shares.sql
-- Live location sharing: a person shares where they are with friends or family
-- through a link. No account is needed on either side.
--
-- Two secrets per share, both stored only as hashes:
--   * the VIEW link (given to friends/family) — can only read the position
--   * the SENDER key (kept in the sender's browser) — can update or stop it
--
-- Only the latest position is kept, and it is cleared when the share ends.
-- Same access model as the other tables: row level security on, no policies;
-- only our server routes (service role) read or write it.

create table if not exists public.trip_shares (
  id                uuid primary key default gen_random_uuid(),
  view_token_hash   text not null unique,
  sender_token_hash text not null unique,
  label             text,
  destination_name  text,
  last_lat          double precision,
  last_lng          double precision,
  last_speed        real,
  last_heading      real,
  last_seen         timestamptz,
  expires_at        timestamptz not null,
  ended_at          timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists trip_shares_expires_idx on public.trip_shares (expires_at);

alter table public.trip_shares enable row level security;

notify pgrst, 'reload schema';
