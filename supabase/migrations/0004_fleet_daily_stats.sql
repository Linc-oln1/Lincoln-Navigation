-- 0004_fleet_daily_stats.sql
-- Business analytics (Pro): per-vehicle daily totals for the Fleet
-- "Activity" tab. Deliberately NOT a location history — only running totals
-- per vehicle per day (distance, time moving, top speed), so no trail of
-- where anyone has been is kept.
--
-- Same access model as fleet_vehicles: row level security on, no policies;
-- only the server routes (service role) read or write it.

create table if not exists public.fleet_daily_stats (
  vehicle_id     uuid not null references public.fleet_vehicles (id) on delete cascade,
  day            date not null,
  distance_m     double precision not null default 0,
  moving_seconds integer not null default 0,
  max_speed      real not null default 0,   -- metres per second
  updated_at     timestamptz not null default now(),
  primary key (vehicle_id, day)
);

alter table public.fleet_daily_stats enable row level security;

-- Adds one position-to-position segment to the day's running totals, in a
-- single atomic upsert so concurrent updates from one vehicle can't lose data.
create or replace function public.fleet_add_sample(
  p_vehicle uuid,
  p_day     date,
  p_dist    double precision,
  p_secs    integer,
  p_speed   real
) returns void
language sql
as $$
  insert into public.fleet_daily_stats (vehicle_id, day, distance_m, moving_seconds, max_speed)
  values (p_vehicle, p_day, p_dist, p_secs, p_speed)
  on conflict (vehicle_id, day) do update set
    distance_m     = public.fleet_daily_stats.distance_m + excluded.distance_m,
    moving_seconds = public.fleet_daily_stats.moving_seconds + excluded.moving_seconds,
    max_speed      = greatest(public.fleet_daily_stats.max_speed, excluded.max_speed),
    updated_at     = now();
$$;

-- Only the server (service role) may call it.
revoke execute on function public.fleet_add_sample(uuid, date, double precision, integer, real)
  from public, anon, authenticated;
grant execute on function public.fleet_add_sample(uuid, date, double precision, integer, real)
  to service_role;

notify pgrst, 'reload schema';
