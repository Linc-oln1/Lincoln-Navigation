# User accounts — design spec

**Status:** Phase 1 (auth shell) built — inert until a Supabase
project is connected, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).
Phases 2–4 not started.
**Decisions locked:** Supabase; magic link + Google; subscriptions
only (no one-off charge).
**Why:** premium entitlement is currently a signed cookie on one
device (see [MONETIZATION.md](./MONETIZATION.md) "Known limitations").
A paying customer loses access on a new device, and the cap-style
gates are client-side only. Accounts make premium real and unlock
cross-device sync for saved places and trip history.

---

## Decision needed first: backend / auth provider

**Recommendation: Supabase.** One free project gives Postgres +
Auth + row-level security + a generous free tier (≈50k monthly
active users, 500 MB DB). We need a database anyway for
subscriptions and synced data, so bundling auth with it is the
least moving parts for a solo project already on Vercel.

| Option | Gives us | Trade-off |
| --- | --- | --- |
| **Supabase** (recommended) | Auth + Postgres + RLS + storage, `@supabase/ssr` for Next App Router | Another dashboard; vendor lock-in on RLS policies |
| Clerk | Best auth DX, prebuilt UI | Still need a separate DB; pricing scales with MAU |
| Auth.js v5 + Postgres (Neon/Vercel PG) | Fully in-repo, no auth vendor | Most wiring; you own session/adapter/DB glue |

Everything below assumes Supabase. If we pick Auth.js instead, the
data model is identical — only the session/auth calls change.

### Login methods (decide)

- **Email magic link** — simplest, no passwords to manage. Default on.
- **Google OAuth** — one-tap for most users. Recommended.
- **Phone / SMS OTP** — common in Ghana, but Supabase SMS needs a
  paid Twilio/MessageBird hookup. Defer unless you want it day one.

Proposed: magic link + Google for launch.

---

## Principles

1. **Auth is additive.** Signed-out users keep the entire app —
   map, search, directions, explore, and up to the free limits of
   saved places / history in localStorage. Sign-in adds sync +
   premium, it never gates the core product.
2. **localStorage stays as the offline/anonymous layer.** For
   signed-in users it becomes a write-through cache of the DB.
3. **The DB is the source of truth for entitlement.** The signed
   cookie stays only as a short-TTL fast path, refreshed from the
   subscription row.

---

## Data model (Postgres / Supabase)

```
profiles
  id            uuid  PK, = auth.users.id
  display_name  text
  created_at    timestamptz

subscriptions
  id                 uuid PK
  user_id            uuid  FK -> profiles.id, unique
  status             text  -- 'active' | 'past_due' | 'cancelled' | 'none'
  plan               text  -- 'premium_monthly'
  paystack_customer  text
  paystack_sub_code  text
  current_period_end timestamptz
  updated_at         timestamptz

saved_places
  id          uuid PK
  user_id     uuid FK
  kind        text  -- 'favorite' | 'home' | 'work'
  name        text
  address     text
  lat         double precision
  lng         double precision
  created_at  timestamptz
  -- unique (user_id, kind) where kind in ('home','work')

recent_searches
  id          uuid PK
  user_id     uuid FK
  name        text
  address     text
  lat         double precision
  lng         double precision
  type        text
  searched_at timestamptz
  -- app keeps newest N per user (N = tier limit)
```

**RLS:** every table — `user_id = auth.uid()` for select/insert/
update/delete. `subscriptions` is writable only by the service role
(the webhook), readable by its owner.

---

## Entitlement flow (replaces the one-off charge)

Move from a single Paystack transaction to **Paystack Plans +
Subscriptions**:

1. `/pricing` → `POST /api/billing/checkout` initialises a
   transaction with `plan=<PLAN_CODE>` and the signed-in user's
   email; `metadata.user_id` set.
2. Paystack hosted checkout → redirect back to
   `/api/billing/verify` (unchanged shape).
3. **New: `POST /api/billing/webhook`** — verify
   `x-paystack-signature` (HMAC-SHA512 of the raw body with
   `PAYSTACK_SECRET_KEY`), then handle:
   - `charge.success` / `subscription.create` → upsert
     `subscriptions` row `status='active'`, set
     `current_period_end`, store `paystack_sub_code`.
   - `invoice.payment_failed` → `status='past_due'`.
   - `subscription.disable` / `subscription.not_renew` →
     `status='cancelled'` (keep access until
     `current_period_end`).
4. `/account` → "Manage / cancel" calls Paystack
   `/subscription/disable` with the sub code + email token.

`hasActivePremium()` becomes: `subscription.status in
('active','cancelled') AND current_period_end > now()`.

---

## Session handling

- `@supabase/ssr` client (browser + server variants).
- `middleware.ts` — refreshes the Supabase session cookie on every
  request (standard Supabase Next.js pattern). This is the app's
  first middleware. (Next 16.2 logs a notice asking to rename this
  to `proxy.ts`, but its Turbopack dev server fails to load a
  `proxy.ts` export as of 16.2 — revisit when that's fixed.)
- Server components / route handlers read the user via the server
  client; no user id is ever trusted from the request body.

---

## Code changes

### New

| Path | Purpose |
| --- | --- |
| `lib/supabase/{client,server,middleware}.ts` | SSR client factories |
| `middleware.ts` | session refresh |
| `app/login/page.tsx` | magic link + Google buttons |
| `app/auth/callback/route.ts` | OAuth / magic-link code exchange |
| `app/account/page.tsx` | subscription status, manage, sign out |
| `app/api/billing/webhook/route.ts` | Paystack webhook |
| `lib/subscriptions.ts` | `getSubscription(userId)`, status helpers |
| `hooks/use-session.ts` | current user (SWR) |
| `hooks/use-account-data.ts` | saved places + history from DB (SWR), write-through |
| `supabase/migrations/*.sql` | schema + RLS |

### Changed

| Path | Change |
| --- | --- |
| `hooks/use-premium.ts` | back `isPremium` with the subscription row when signed in; cookie fast-path otherwise |
| `lib/premium-guard.ts` | `requirePremium(req)` becomes async — look up the session user's subscription; cookie stays as fallback |
| `lib/premium.ts` | `hasActivePremium()` reads a hydrated value from the session provider instead of parsing the cookie directly |
| `hooks/use-saved-places.ts` | signed-in → `use-account-data`; signed-out → today's localStorage path unchanged |
| `hooks/use-recent-searches.ts` | same split |
| `app/api/billing/checkout/route.ts` | use Plan code; attach `user_id` |
| `app/api/billing/verify/route.ts` | still sets the fast-path cookie, now also keyed to the user |
| `components/map/header.tsx` | account avatar / "Sign in" entry |
| `app/pricing/page.tsx` | if signed out, "Sign in to subscribe" first |

### Migration of existing local data

On first sign-in, if localStorage has saved places, show a one-time
"Import your N saved places to this account?" prompt → bulk insert →
mark localStorage as migrated (keep it as cache).

---

## Phasing

| Phase | Scope | Ships value |
| --- | --- | --- |
| **1. Auth shell** ✅ built | Supabase clients, `middleware.ts` session refresh, `/login` (magic link + Google), `/auth/callback`, `/auth/signout`, `/account`, header entry, `supabase/migrations/0001_profiles.sql` | People can create accounts |
| **2. Synced data** | `saved_places` + `recent_searches` tables + RLS, `use-account-data`, hook split, localStorage import | Saved places follow you across devices |
| **3. Real subscriptions** | Paystack Plan, webhook, `subscriptions` table, entitlement from DB, `/account` manage/cancel | Premium survives device changes; recurring revenue |
| **4. Cleanup** | make `requirePremium` async everywhere, drop cookie-only assumptions, docs | — |

Phases 1–2 are independent of Paystack and can ship while the
Paystack account is still in verification.

---

## New env vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only — webhook writes
PAYSTACK_PLAN_CODE=               # created in Paystack dashboard
PAYSTACK_WEBHOOK_SECRET=          # = PAYSTACK_SECRET_KEY for signature check
```

Add to `.env.example` and Vercel (all environments).

---

## Rough effort

- Phase 1: ~1 focused day
- Phase 2: ~1–2 days (the hook split + import UX is the fiddly part)
- Phase 3: ~1 day (webhook + Paystack Plans + `/account`)
- Phase 4: ~half a day

---

## Open questions for the owner

1. Supabase, or Auth.js + a standalone Postgres?
2. Login methods for launch — magic link + Google, or add phone/SMS?
3. Supabase region (pick closest available — likely `eu-west` /
   `eu-central`; there is no Africa region yet).
4. Keep the one-off charge as a fallback "pay for a month" option,
   or subscriptions only?
5. Do we want accounts to also enable a lightweight **advertiser
   dashboard** later (self-serve sponsored places), or keep that
   manual for now?
