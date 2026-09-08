# Supabase setup

Steps only the project owner can do. Until these are done, auth is
inert: `/login` and `/account` show a "not available yet" notice,
the header shows no account button, and the middleware no-ops.

Design context: [USER_ACCOUNTS.md](./USER_ACCOUNTS.md).

---

## 1. Create the project

1. [supabase.com](https://supabase.com) → **New project**.
2. Region: pick the closest available — likely **West EU (London)**
   or **Central EU (Frankfurt)**; there is no Africa region.
3. Save the database password somewhere safe.

## 2. Run the migration

**Dashboard → SQL Editor → New query**, paste the contents of
[`supabase/migrations/0001_profiles.sql`](../supabase/migrations/0001_profiles.sql),
run it. (Or `supabase db push` if you set up the CLI.)

## 3. Auth settings

**Dashboard → Authentication → URL Configuration:**
- **Site URL:** `https://www.lincolnnavigation.com`
- **Redirect URLs:** add both
  - `https://www.lincolnnavigation.com/auth/callback`
  - `http://localhost:3000/auth/callback`

**Authentication → Providers:**
- **Email** — enabled by default. Confirm "Enable email provider"
  is on; magic links work out of the box.
- **Google** — toggle on, then fill Client ID + Client Secret from
  step 4.

## 4. Google OAuth client

1. [console.cloud.google.com](https://console.cloud.google.com) →
   create/select a project.
2. **APIs & Services → OAuth consent screen** — External, add app
   name + your email. Publish (or add yourself as a test user).
3. **APIs & Services → Credentials → Create credentials → OAuth
   client ID → Web application.**
4. **Authorized redirect URI:** the callback URL from your Supabase
   project — **Authentication → Providers → Google** shows the exact
   value, it looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`.
5. Copy the Client ID + Secret into Supabase's Google provider
   config (step 3).

## 5. Environment variables

**Settings → API** in Supabase gives you:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` / `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key (secret!) → `SUPABASE_SERVICE_ROLE_KEY`

Add all three to:
- `Lincoln-Navigation/.env.local` (local dev)
- **Vercel → Settings → Environment Variables** (all environments)

Then restart `pnpm dev` / redeploy.

## 6. Verify

- `/login` shows Google + email options (not the "not available"
  notice).
- Sign in with email → link arrives → lands on `/app` with the
  account initial in the header.
- **Supabase → Table editor → profiles** has a row for your user.
- `/account` shows your email and a working "Sign out".

---

## What's next (not in this phase)

Phase 2 adds `saved_places` / `recent_searches` tables + sync;
Phase 3 adds the `subscriptions` table, a Paystack Plan, and the
`/api/billing/webhook` — see [USER_ACCOUNTS.md](./USER_ACCOUNTS.md).
