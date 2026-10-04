-- 0012_referral_rewards.sql
-- Referral reward: when a friend signs up with your code (and confirms their
-- email) you each get 7 days of Pro. profiles.pro_until is the end of the
-- free Pro time; referral_rewards is the record (one row per person per
-- referred friend, so a reward can never be granted twice).
-- Row level security on, no policies: only our server routes (service role).

alter table public.profiles add column if not exists pro_until timestamptz;

create table if not exists public.referral_rewards (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,  -- who got the days
  referred_user uuid not null references public.profiles (id) on delete cascade,  -- the friend who signed up
  role          text not null check (role in ('referrer', 'friend')),
  days          integer not null default 7,
  created_at    timestamptz not null default now(),
  unique (user_id, referred_user)
);

create index if not exists referral_rewards_user_idx on public.referral_rewards (user_id);

alter table public.referral_rewards enable row level security;

notify pgrst, 'reload schema';
