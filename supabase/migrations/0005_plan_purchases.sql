-- 0005_plan_purchases.sql
-- A record of every plan payment, so a paid plan follows the customer and not
-- just one browser: signed in on a new phone, they can restore it.
--
-- Same access model as the fleet tables: row level security on, no policies;
-- only our server routes (service role) read or write it.

create table if not exists public.plan_purchases (
  reference  text primary key,             -- the Paystack reference, one row per payment
  plan       text not null check (plan in ('premium', 'pro')),
  email      text not null,                -- the Paystack customer email
  user_id    uuid references auth.users (id) on delete set null,
  paid_at    timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists plan_purchases_email_idx on public.plan_purchases (lower(email));
create index if not exists plan_purchases_user_idx on public.plan_purchases (user_id);

alter table public.plan_purchases enable row level security;

notify pgrst, 'reload schema';
