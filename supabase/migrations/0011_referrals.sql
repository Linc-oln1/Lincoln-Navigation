-- 0011_referrals.sql
-- Referral codes: every profile gets a short unique code; a new user can sign
-- up with someone else's code (or /signup?ref=CODE link) and is linked to them.

create or replace function public.gen_referral_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by   uuid references public.profiles (id) on delete set null,
  add column if not exists referred_at   timestamptz;

update public.profiles set referral_code = public.gen_referral_code() where referral_code is null;

alter table public.profiles alter column referral_code set default public.gen_referral_code();
alter table public.profiles alter column referral_code set not null;

create index if not exists profiles_referred_by_idx on public.profiles (referred_by);

-- Sign-up carries the code in user metadata (email sign-up); Google sign-ups
-- are linked afterwards through /api/referral/claim.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  referrer uuid;
begin
  select id into referrer
  from public.profiles
  where referral_code = upper(trim(new.raw_user_meta_data ->> 'referral_code'));

  insert into public.profiles (id, display_name, referred_by, referred_at)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    referrer,
    case when referrer is not null then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Users must not be able to rewrite their own referral link or code.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

notify pgrst, 'reload schema';
