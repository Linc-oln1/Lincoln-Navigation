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
- Add a Paystack webhook endpoint and verify its signature with
  `PAYSTACK_SECRET_KEY`.

### Plans on /pricing

Three cards, defined in `lib/monetization.ts` (`FREE_FEATURES`,
`PREMIUM_FEATURES`, `PRO_FEATURES`). Anything on a plan that isn't built yet
carries `soon: true` and shows a "Coming soon" tag — flip it off when the
feature ships. **Premium** is GHS 90/month (`NEXT_PUBLIC_PREMIUM_PRICE_PESEWAS`,
default 9000; Paystack still sells 31 days at a time, no auto-renewal).
**Pro** is GHS 225/month (`NEXT_PUBLIC_PRO_PRICE_PESEWAS`) but has no checkout:
its button goes to `/business#talk-to-us` until the Pro tools exist.

### What's gated today

| Feature | Free | Premium | Where |
| --- | --- | --- | --- |
| Ads | shown | hidden | `<AdSlot>` via `usePremium()` |
| Saved places | 10 | unlimited | `hooks/use-saved-places.ts` (`FREE_LIMITS.savedPlaces`) — 11th save shows an upgrade prompt |
| Trip history | 5 | 50 | `hooks/use-recent-searches.ts` (`*_LIMITS.tripHistory`) |
| Voice navigation | off (on-screen steps only) | on | `components/map/directions-panel.tsx` + `hooks/use-live-navigation.ts` (`speakNavigation`) |
| Live traffic (map layer + traffic-aware times) | locked (upsell to /pricing) | coloured traffic on the map, times that include current traffic | `components/map/traffic-toggle.tsx`, `app/api/traffic-tiles/`, `app/api/traffic-directions/` — both verify the signed cookie server-side (`requirePremium`) and use `MAPBOX_ACCESS_TOKEN` (Mapbox Traffic v1 tiles + `driving-traffic` directions) |
| Live traffic summary (Free) | one line under the route: "Traffic now: Moderate · 6 min slower than usual" (road modes) | the same plus the coloured map layer, traffic-aware ETAs and route choices (see above) | `app/api/traffic-summary/route.ts` — **public**, uses `MAPBOX_ACCESS_TOKEN` (one `driving-traffic` directions call per new route; 2-min cache, 40 requests/hour per IP, in-memory) so Mapbox usage grows with free users |
| Business discovery (Explore Nearby) | plain list | distance + nearest-first, open/closed (from OSM `opening_hours`), Call and Website links, filters (Open now / Has phone / Has website), same details on the place card | `components/map/places-panel.tsx`, `components/map/location-details.tsx`, `lib/opening-hours.ts`; data from `app/api/places` (OSM `phone`, `website`, `opening_hours`, `cuisine`). Coverage in Ghana is patchy — places without hours are never shown as open/closed |
| Route options | locked (upsell to /pricing) | fastest/shortest, avoid highways/tolls/ferries, choose between routes | `components/map/directions-panel.tsx` + `app/api/directions/route.ts` (needs `ORS_API_KEY`; without it the standard route is shown with a notice) |
| Live View (AR camera) | locked (upsell to /pricing) | on | `components/map/directions-panel.tsx` (the Live View button) |
| Offline maps | — | — | built — saves OpenFreeMap tiles to Cache Storage; SW `public/sw.js` serves them; UI-gated only |
| Real-time road alerts | locked (upsell to /pricing) | bell with hazards within 5 km of the device, refreshed every minute, banner when a new one appears | `components/map/road-alerts.tsx`, `hooks/use-nearby-alerts.ts`; reads the public `/api/hazards` (UI-gated only). Crowd reports need Upstash; without it only forecast flood alerts appear |
| Location intelligence (landmark search) | hint linking to /pricing when a search looks like a landmark description | search like "opposite the filling station" / "near the market" adds a "Landmark match" card: an estimated position with its accuracy radius | `components/map/search-panel.tsx`, `lib/geo-intelligence/landmark-query.ts` (client check), `app/api/geo/landmark/route.ts` (**server-gated** with `requirePremium`; Overpass anchor lookup within 3 km of the map centre, English phrasing only) |
| Route optimization (Pro) | padlocked button → /pricing | Pro: route planner button; up to 12 stops → best visiting order, leg times, route on the map | `components/map/route-planner.tsx`, `app/api/optimize/route.ts` (**server-gated** with `requirePro`; OSRM `trip` solver, no key) |
| Fleet tools (Pro) | padlocked button → /pricing | Pro + signed in: register vehicles, send each driver a link (`/drive/<secret>`, no account) that shares the phone's location, see every vehicle live on the map | `components/map/fleet-panel.tsx`, `components/fleet/driver-share.tsx`, `app/api/fleet/*`, `lib/fleet-server.ts`, `lib/supabase/admin.ts`. **Needs `supabase/migrations/0003_fleet_vehicles.sql` run once** and `SUPABASE_SERVICE_ROLE_KEY`. Table has RLS on and no policies — only the server routes (service role) touch it. Only the latest position is stored, no history |
| Advanced routing / truck routing (Pro) | padlocked row in the directions panel → /pricing | driving mode: tick "Route for a truck", enter height/width/length/weight → ORS `driving-hgv` route that respects the vehicle's restrictions | `components/map/directions-panel.tsx`, `app/api/directions/route.ts` (**server-gated** with `requirePro` whenever `truck` is sent; needs `ORS_API_KEY`). If the truck route can't be made, the standard route is shown with a red warning that it ignores the vehicle — never silently |
| Business analytics (Pro) | — (part of Fleet) | Fleet sheet → Activity tab: last 7/30 days, fleet totals (distance, time moving, top speed), distance-per-day bars, per-vehicle table | `components/map/fleet-panel.tsx` (`ActivityView`), `app/api/fleet/stats/route.ts` (owner only), totals written by `app/api/fleet/position/route.ts` via `segmentSample()` in `lib/fleet-server.ts`. **Needs `supabase/migrations/0004_fleet_daily_stats.sql` run once.** Stores running daily totals only, never a location history; standing still, gaps over 5 min and >200 km/h jumps aren't counted |
| Professional navigation / runs (Pro) | — (part of the route planner) | "Start this run" in the planner → a run card on the map: next stop, Navigate (opens directions with the stop filled in), Done / Skip / Undo, time left, run summary. Saved on the device (`ln_run`) so it survives reloads | `components/map/run-card.tsx`, `components/map/route-planner.tsx` (`onStartRun`), `app/app/page.tsx`. Client-side only (the planner itself is server-gated via `/api/optimize`) |
| Priority routing | — | — | not built |

How to gate something:

- **Client UI / limits** — `usePremium().isPremium` / `.can("feature")`
  / `.limits`, or `hasActivePremium()` / `getTierLimits()` from
  `lib/premium.ts` in non-hook code. Client checks read the cookie
  payload only; treat them as UX, not security.
- **A paid server endpoint** — `requirePremium(req)` from
  `lib/premium-guard.ts` returns a `402` for non-subscribers (it
  verifies the cookie's HMAC signature). Use this when offline map
  packs or priority routing get real endpoints.
- Add the capability name to `PremiumFeature` in
  `lib/monetization.ts` and update the table above.

Client gates are cookie-based and per-device — the same caveat as
the "No accounts yet" limitation. Someone editing `localStorage` or
the cookie can lift a client limit; that's acceptable for
save-count UX, but anything with real cost must use
`requirePremium()` server-side.


## Plans in the cookie (Pro)

`ln_premium` now carries `plan: "premium" | "pro"` (absent = premium, so
older cookies still work). Pro includes Premium: `requirePremium` passes
for both, `requirePro` (lib/premium-guard) only for Pro. Checkout takes
`{ email, plan }`; the plan and amount are set server-side, and
`/api/billing/verify` only issues a Pro cookie if the Paystack transaction
was tagged `pro_monthly` **and** the amount paid covers `PRO_PRICE_PESEWAS`.
A later Premium purchase never replaces a still-valid Pro cookie.
Still to build for Pro (shown "Coming soon"): professional navigation, fleet
tools, advanced routing, business analytics, multiple vehicles.
