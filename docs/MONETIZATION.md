# Monetization

LincolnNavigation.com has three revenue streams. All are **off by
default** and driven entirely by environment variables — the repo
contains no account ids or secret keys. Turn each on by filling in
the matching vars in `.env.local` (and in your host's env for
production).

| Stream | Turns on when | Where it shows |
| --- | --- | --- |
| Display ads (AdSense) | `NEXT_PUBLIC_ADSENSE_CLIENT` set | Landing page inline unit, "Explore Nearby" panel footer |
| Sponsored places | an entry added to `lib/sponsored-places.ts` | Pinned to the top of its category in "Explore Nearby" |
| Premium plan (Paystack) | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` + `PAYSTACK_SECRET_KEY` set | `/pricing` |

Central config: [`lib/monetization.ts`](../lib/monetization.ts).

---

## 1. Display ads — Google AdSense

1. Apply at <https://adsense.google.com> with the live domain
   `lincolnnavigation.com`. Approval needs real traffic and a few
   content pages — it can take days to weeks.
2. Once approved, create **two display units** ("Landing inline",
   "Explore panel"). Each gives you a numeric slot id.
3. Set:
   ```
   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
   NEXT_PUBLIC_ADSENSE_SLOT_LANDING=1234567890
   NEXT_PUBLIC_ADSENSE_SLOT_PLACES=0987654321
   ```
4. `/ads.txt` is generated automatically from
   `NEXT_PUBLIC_ADSENSE_CLIENT` (see `app/ads.txt/route.ts`) — verify
   it resolves in AdSense.

Notes:
- Premium visitors never see ads (`<AdSlot>` returns `null`).
- Before configuration, `<AdSlot>` shows a dashed placeholder in dev
  and renders nothing in production.
- Components: `components/ads/adsense-script.tsx` (site-wide loader,
  in the root layout), `components/ads/ad-slot.tsx` (one unit).

## 2. Sponsored places

Local businesses pay to be pinned to the top of their category in
the "Explore Nearby" panel, labelled **Sponsored**.

- Data lives in [`lib/sponsored-places.ts`](../lib/sponsored-places.ts).
  The list is **empty on purpose** — the app never shows fabricated
  businesses. Add an entry only for a business that has actually
  paid.
- Each entry needs a `category` matching an id in the `CATEGORIES`
  list in `components/map/places-panel.tsx`
  (`restaurant`, `hotel`, `fuel`, …), a lat/lng, and a `radiusKm`
  (how close the map centre must be for it to appear). Optional
  `startsAt` / `endsAt` bound the campaign.
- The `/advertise` page is the sales funnel — it emails enquiries to
  `NEXT_PUBLIC_ADVERTISE_EMAIL`.

A natural next step is to move this list into a database / CMS with a
self-serve dashboard, but the static file is enough to start selling.

### House promo

Until a category has a paying sponsor, the panel shows a **house
promo** for the advertising programme itself — "Own a business near
here?" linking to `/advertise`. It's labelled `AD` (not
"Sponsored"), styled as a dashed card so it reads as house content,
and a real sponsor for that category always replaces it. Config in
`lib/monetization.ts` (`HOUSE_PROMO`); hide it entirely with
`NEXT_PUBLIC_HOUSE_PROMO=off`.

## 3. Premium plan — Paystack

Paystack is used because it settles in GHS to Ghanaian bank accounts.

1. Create a business account at <https://paystack.com>, complete
   verification.
2. From **Settings → API Keys & Webhooks**, copy the public and
   secret keys (use test keys first):
   ```
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
   PAYSTACK_SECRET_KEY=sk_test_xxx
   PREMIUM_COOKIE_SECRET=<random 32+ chars, e.g. `openssl rand -hex 32`>
   NEXT_PUBLIC_SITE_URL=https://lincolnnavigation.com
   ```
3. Price defaults to **GHS 30.00 / month**. Override with
   `NEXT_PUBLIC_PREMIUM_PRICE_PESEWAS` (100 pesewas = GHS 1, so
   `3000` = GHS 30, `5000` = GHS 50) and
   `NEXT_PUBLIC_PREMIUM_CURRENCY`.

Flow:
```
/pricing  ──POST /api/billing/checkout──▶  Paystack hosted checkout
                                                   │
        ◀──redirect /api/billing/verify?reference=… ┘
        verify server-side → set signed `ln_premium` cookie → /pricing?welcome=1
```

Files: `app/pricing/page.tsx`, `app/api/billing/checkout/route.ts`,
`app/api/billing/verify/route.ts`, `lib/premium-cookie.ts` (HMAC
sign/verify), `hooks/use-premium.ts` (client UI state).

### Known limitations (do before charging real money)

- **No accounts yet.** Entitlement is a signed cookie on the paying
  device. If the user clears cookies or switches devices they lose
  access. Add auth + a `subscriptions` table and replace
  `readEntitlement()` / `verifyPremiumCookie()` call sites with a
  per-user lookup.
- **One-off charge, not a true subscription.** The current flow
  charges once and grants ~31 days. For real recurring billing, use
  Paystack **Plans + Subscriptions** and a webhook
  (`charge.success`, `subscription.disable`) to extend/revoke the
  entitlement.
- **Gate the paid features.** `usePremium()` currently only hides
  ads. Offline maps / voice nav / higher save limits still need to be
  built and gated behind `verifyPremiumCookie()` on the server.
- Add a Paystack webhook endpoint and verify its signature with
  `PAYSTACK_SECRET_KEY`.
