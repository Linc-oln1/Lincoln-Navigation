-- 0007_sponsors.sql
-- Sponsored places ("Explore Nearby" paid placements), moved out of
-- lib/sponsored-places.ts so they can be sold, approved and ended from
-- /admin/sponsors without a redeploy — plus daily view/click counts to
-- report back to advertisers.
--
-- Same access model as plan_purchases: row level security on, no
-- policies; only our server routes (service role) read or write.

create table if not exists public.sponsors (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  address           text not null,
  lat               double precision not null,
  lng               double precision not null,
  category          text not null,           -- places-panel category id
  tagline           text,
  url               text,
  package           text not null check (package in ('local', 'citywide', 'custom')),
  radius_km         numeric not null check (radius_km > 0),
  status            text not null default 'awaiting_payment' check (status in (
                      'awaiting_payment',  -- form sent, not paid yet
                      'pending_review',    -- paid, waiting for approval
                      'active',            -- live on the map
                      'paused',
                      'ended',
                      'rejected'
                    )),
  starts_at         timestamptz,
  ends_at           timestamptz,
  contact_name      text,
  contact_email     text not null,
  contact_phone     text,
  paystack_reference text unique,
  amount_pesewas    integer,
  paid_at           timestamptz,
  notes             text,                    -- admin-only notes
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists sponsors_status_idx on public.sponsors (status);

alter table public.sponsors enable row level security;

create table if not exists public.sponsor_daily_stats (
  sponsor_id     uuid not null references public.sponsors (id) on delete cascade,
  day            date not null,
  impressions    integer not null default 0,
  clicks         integer not null default 0,   -- opened the listing
  website_clicks integer not null default 0,   -- tapped "Visit website"
  primary key (sponsor_id, day)
);

alter table public.sponsor_daily_stats enable row level security;

-- Atomic +1 for one counter; called by /api/sponsored/track.
create or replace function public.bump_sponsor_stat(p_sponsor uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('impression', 'click', 'website') then
    raise exception 'unknown stat kind %', p_kind;
  end if;
  insert into public.sponsor_daily_stats as s (sponsor_id, day, impressions, clicks, website_clicks)
  values (
    p_sponsor,
    (now() at time zone 'Africa/Accra')::date,
    (p_kind = 'impression')::int,
    (p_kind = 'click')::int,
    (p_kind = 'website')::int
  )
  on conflict (sponsor_id, day) do update set
    impressions    = s.impressions    + excluded.impressions,
    clicks         = s.clicks         + excluded.clicks,
    website_clicks = s.website_clicks + excluded.website_clicks;
end;
$$;

revoke all on function public.bump_sponsor_stat(uuid, text) from public, anon, authenticated;
grant execute on function public.bump_sponsor_stat(uuid, text) to service_role;

-- The first advertiser, previously hard-coded in lib/sponsored-places.ts.
insert into public.sponsors (name, address, lat, lng, category, package, radius_km, status, starts_at, contact_email, notes)
select 'Franchman Enterprise', 'Blofonyo Ln, Abossey Okai, Accra · GA-216-6164',
       5.5605857, -0.231748, 'shop', 'custom', 8, 'active', now(),
       'advertise@lincolnnavigation.com',
       'Migrated from lib/sponsored-places.ts. Still waiting on promo line, website, exact location and end date. Geocoded from the street — not in OSM.'
where not exists (select 1 from public.sponsors where name = 'Franchman Enterprise');

notify pgrst, 'reload schema';
