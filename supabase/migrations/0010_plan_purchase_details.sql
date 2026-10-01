-- 0010_plan_purchase_details.sql
-- What each plan payment was, for the customer's payment history on
-- /account: the amount actually paid, how it was bought, and the channel.
-- Older rows (before this) leave these empty; the page shows "—" for them.

alter table public.plan_purchases
  add column if not exists amount_pesewas integer,
  add column if not exists currency       text,
  add column if not exists kind           text check (kind in ('monthly', 'renewal', 'once')),
  add column if not exists channel        text;  -- Paystack channel: card, mobile_money, bank…

notify pgrst, 'reload schema';
