-- 0013_referral_email_claims.sql
-- Anti-abuse for referral rewards: one reward per real person. A friend's
-- email is reduced to a key (Gmail dots and +tags removed) and claimed here
-- the first time it earns a reward. No foreign key on purpose: deleting the
-- account and signing up again must not earn it a second time.
-- Row level security on, no policies: only our server routes (service role).

create table if not exists public.referral_email_claims (
  email_key  text primary key,
  user_id    uuid not null,
  created_at timestamptz not null default now()
);

alter table public.referral_email_claims enable row level security;

notify pgrst, 'reload schema';
