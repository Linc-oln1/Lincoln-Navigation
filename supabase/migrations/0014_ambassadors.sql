-- 0014_ambassadors.sql
-- Promoters ("ambassadors"): staff who bring in an audience through their
-- referral link (profiles.referral_code, see 0011). Target per promoter:
-- 150 new users, 50 of them paying Premium/Pro subscribers. Pay: GHS 1,000
-- per 50 verified subscribers. Counts come from referred_by + plan_purchases;
-- ambassador_payouts records what has actually been paid out.
-- Row level security on, no policies: only our server routes (service role).

alter table public.profiles add column if not exists is_ambassador boolean not null default false;

create table if not exists public.ambassador_payouts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  amount_ghs  integer not null check (amount_ghs > 0),
  note        text,
  paid_at     timestamptz not null default now()
);

create index if not exists ambassador_payouts_user_idx on public.ambassador_payouts (user_id);

alter table public.ambassador_payouts enable row level security;

notify pgrst, 'reload schema';
