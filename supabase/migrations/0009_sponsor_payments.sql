-- 0009_sponsor_payments.sql
-- Renewal payments for sponsored listings (the "Renew my listing" link in
-- our emails → /advertise/renew). One row per Paystack payment. `applied`
-- is claimed atomically before the listing's end date is pushed back, so a
-- payment reported twice (webhook + browser return) extends it only once.
--
-- Same access model as sponsors: row level security on, no policies; only
-- our server routes (service role) read or write.

create table if not exists public.sponsor_payments (
  reference      text primary key,                 -- our lnsr_… Paystack reference
  sponsor_id     uuid not null references public.sponsors (id) on delete cascade,
  kind           text not null default 'renewal' check (kind in ('renewal')),
  amount_pesewas integer not null,
  paid_at        timestamptz not null,
  applied        boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists sponsor_payments_sponsor_idx on public.sponsor_payments (sponsor_id);

alter table public.sponsor_payments enable row level security;

notify pgrst, 'reload schema';
