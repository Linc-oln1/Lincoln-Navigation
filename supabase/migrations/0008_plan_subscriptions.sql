-- 0008_plan_subscriptions.sql
-- Premium and Pro renew monthly by card through Paystack Subscriptions.
-- One row per Paystack subscription, kept up to date by the webhook, so
-- /account can show "renews on …" and offer cancel / update card.
--
-- Each successful charge (first and renewals) is still one plan_purchases
-- row; the plan a customer has is still decided from those payments.
--
-- Same access model as plan_purchases: row level security on, no policies;
-- only our server routes (service role) read or write.

create table if not exists public.plan_subscriptions (
  subscription_code text primary key,        -- SUB_…
  email_token       text,                    -- needed to cancel via the API
  customer_code     text,                    -- CUS_…
  plan              text not null check (plan in ('premium', 'pro')),
  email             text not null,           -- the Paystack customer email
  user_id           uuid references auth.users (id) on delete set null,
  status            text not null,           -- Paystack: active | non-renewing | attention | completed | cancelled
  next_payment_at   timestamptz,
  card_brand        text,
  card_last4        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists plan_subscriptions_user_idx on public.plan_subscriptions (user_id);
create index if not exists plan_subscriptions_email_idx on public.plan_subscriptions (lower(email));

alter table public.plan_subscriptions enable row level security;

notify pgrst, 'reload schema';
