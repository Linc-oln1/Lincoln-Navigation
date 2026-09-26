-- 0003_fleet_vehicles.sql
-- Fleet tools (Pro): a business's vehicles and where each one is right now.
--
-- Access model: this table is NOT readable or writable with the public
-- (anon / signed-in) keys — row level security is on and there are
-- deliberately no policies. Only our server routes (app/api/fleet/*) touch
-- it, using the service-role key, after checking the caller is a signed-in
-- Pro owner (or, for the driver position endpoint, holds the vehicle's
-- secret driver link).

create table if not exists public.fleet_vehicles (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users (id) on delete cascade,
  name              text not null,
  plate             text,
  kind              text not null default 'car',
  -- SHA-256 of the secret in the driver link. The link itself is shown once.
  driver_token_hash text not null unique,
  -- Last position the driver's phone sent. Only the latest is kept.
  last_lat          double precision,
  last_lng          double precision,
  last_speed        real,
  last_heading      real,
  last_seen         timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists fleet_vehicles_owner_idx
  on public.fleet_vehicles (owner_id);

alter table public.fleet_vehicles enable row level security;
