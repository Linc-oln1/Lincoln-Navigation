# Community hazard reports

Drivers flag flooding, police checkpoints, bad road surface,
crashes and closures on the map; everyone else sees them, can
confirm they're still there, or mark them cleared. Reports are
anonymous and expire on their own.

## Pieces

| File | Role |
| --- | --- |
| [`lib/hazards.ts`](../lib/hazards.ts) | Client-safe: `Hazard` type, `HAZARD_KINDS` metadata (label, emoji, colour, TTL, default severity), `fetchHazards` / `reportHazard` / `voteHazard`. |
| [`lib/hazard-store.ts`](../lib/hazard-store.ts) | Server-only store: `HazardStore` interface + Upstash Redis and in-memory implementations, chosen by env. |
| [`lib/hazard-identity.ts`](../lib/hazard-identity.ts) | Server-only: one-way `reporterHash(req)` = HMAC(ip + ua). Rate-limit / de-dup only — never stored on a hazard, never an identity. |
| [`app/api/hazards/route.ts`](../app/api/hazards/route.ts) | `GET ?bbox=` (active reports + seed zones in view), `POST` (create, rate-limited + near-duplicate suppressed). |
| [`app/api/hazards/[id]/vote/route.ts`](../app/api/hazards/[id]/vote/route.ts) | `POST { vote: "confirm" \| "clear" }`, one per reporter per hazard. |
| [`hooks/use-hazards.ts`](../hooks/use-hazards.ts) | Fetches for the visible bounds (debounced), polls every 2 min, `upsert` / `remove` for optimistic updates. |
| [`components/map/hazard-layer.tsx`](../components/map/hazard-layer.tsx) | Plots hazards as tappable MapLibre markers (map-prop pattern, like `LocationMarker`). |
| [`components/map/report-hazard-sheet.tsx`](../components/map/report-hazard-sheet.tsx) | The "Report a hazard" bottom sheet (kind picker, location, optional note). |
| [`components/map/hazard-details.tsx`](../components/map/hazard-details.tsx) | Detail card with "Still there" / "Cleared" votes. |
| [`lib/hazard-geometry.ts`](../lib/hazard-geometry.ts) | Client-safe: `routeBBox`, `hazardsOnRoute` (point-to-segment proximity + distance-along-route), `distanceAlongRoute` (driver position → metres along route), `alongRouteLabel`. |
| [`lib/route-scoring.ts`](../lib/route-scoring.ts) | Client-safe: `countTurns`, `scoreCandidates` (the ETA/turns/hazard formula, extracted once), `pickSaferRoute`. |
| [`components/map/route-hazard-warning.tsx`](../components/map/route-hazard-warning.tsx) | Collapsible "N hazards on this route" banner + the "safer route" offer in the directions panel. |

`MapView` gained `onBoundsChange`, `hazards`, `selectedHazardId`,
`onHazardSelect` and `onUserLocationChange`; `app/app/page.tsx`
wires the layer, the FAB, the sheet and the details card.

## Phase 2 — hazards in routing

### 2a — hazards on a route

After the directions panel calculates a route it fetches
`/api/hazards` once for the bounding box of all candidate routes,
runs `hazardsOnRoute` on the active one, and shows
`RouteHazardWarning` above the turn-by-turn list — each hazard with
its kind, report age and distance along the route. Red when a
`closure` or a severity ≥ 0.7 hazard is on the line, amber
otherwise. Tapping a row calls `onFocusHazard` → `page.tsx`
highlights the marker and recenters the map (the directions panel
stays open, so the full `HazardDetails` card doesn't show — the row
already carries the summary).

### 2b — offer a safer route

`calculateRoute` now requests `alternatives: true`. The fastest
route (min duration, not necessarily OSRM's first) is shown as
always. Each candidate is scored with `scoreCandidates`; if
`pickSaferRoute` finds one that is materially safer — strictly
fewer hazards or ≥ 0.3 lower total severity, no worse single
hazard, at most `max(4 min, 30 %)` slower — the warning card gets a
"A route avoiding … adds N min · [Use it]" footer. **Use it** swaps
geometry + steps + live-nav data to the alternative; dismiss keeps
the fastest. While the offer is up, the alternative is drawn as a
faint dashed line (`MapView` `alternativeRoutePoints` →
`lincoln-route-alt`). The offer clears on recalc, mode change,
swap, dismiss, accept, panel close, or starting live navigation.

`/api/geo/route-plan` merges `getHazardStore().listActive()` for
the O–D box with `HAZARD_SEED`, so that endpoint scores against
live crowd data too — though its `detectHazards` still matches on
route *vertices* (coarser than the panel's segment-distance) and no
UI calls it yet.

The route still comes from OSRM and everything here is advisory —
no `exclude`-style re-routing (that needs Valhalla/GraphHopper,
Phase 3). The OSRM demo server returns alternatives for relatively
few origin–destination pairs, so the offer appears less often than
the warning.

### 2c — hazard ahead during navigation

`useLiveNavigation` takes `routePath` (`[lat,lng]`) + `hazards` and,
on each GPS fix, projects the driver's position onto the route
(`distanceAlongRoute`) and checks the hazards on it
(`hazardsOnRoute`, 120 m corridor). A hazard 0–500 m ahead becomes
`hazardAhead`, which the directions panel renders as a white strip
inside the live-nav card ("🌊 Reported flooding · 250 m ahead") —
shown to everyone. The spoken line ("Heads up — reported flooding
in 200 metres.") goes through `speakMessage`, which no-ops for
non-Premium visitors, and fires once per hazard id per session.

The directions panel re-fetches `/api/hazards` for the route box
every 90 s while navigating, so a flood reported after you set off
still warns you (and one others clear stops warning). The
projection is independent of the turn-by-turn step tracker, so it
keeps working even when GPS noise makes the step tracker think
you're briefly off-route.

### 3a — route around a hazard

When a route passes a hazard and no plain alternative already
avoids it, the warning card offers **"Route around it"**. It builds
~170 m circles around each on-route hazard and asks a routing
engine that can exclude areas for a detour:
`calculateRoute({ avoidAreas })` → `/api/directions` → ORS
`driving-car` with `options.avoid_polygons`
([`lib/geo/avoid-polygon.ts`](../lib/geo/avoid-polygon.ts)). The
result is only applied if it actually clears the hazards
(`hazardsOnRoute`, 140 m) and isn't more than ~2.5× the current
route; otherwise "Couldn't find a way around."

Needs `ORS_API_KEY` (free — the same key that already powers
walking/cycling routing). Without it `/api/directions` returns 501,
`calculateRoute` falls back to a plain OSRM route, and the check
above reports it couldn't clear the hazard. OSRM itself can't
exclude arbitrary areas, so there's no offline path for this.

### 3b — forecast-driven flood zones

The `HAZARD_SEED` flood corridors (Circle/Odawna, Alajo, Adenta
Barrier) no longer show *always* — they only appear while the rain
forecast for them is bad.
[`lib/hazard-feeds/forecast-flood.ts`](../lib/hazard-feeds/forecast-flood.ts)
checks Open-Meteo (keyless) for each zone's next 6 h; when peak
probability ≥ 70 % **and** accumulation ≥ 8 mm it emits a `Hazard`
with `source: "forecast"`, severity scaled to the rain, and a 3 h
TTL. `/api/hazards` merges these in place of the static flood seeds
(30-min server cache). Non-flood seed zones stay static. On a dry
day there's simply no flood marker. Renders like an official zone
(dashed, no votes) with "heavy rain forecast" copy. **Works in
production regardless of the store** — it's not crowd data.

## Storage

Crowd data must persist across devices, so this needs a real
datastore — unlike weather, an ephemeral fallback in production
would be misleading, so:

- **Upstash Redis** when `UPSTASH_REDIS_REST_URL` / `_TOKEN` (or the
  Vercel integration's `KV_REST_API_URL` / `_TOKEN`) are set. Add
  "Upstash for Redis" from the Vercel Marketplace — ~5 min, no code
  change. Keys: `hz:h:<id>` (JSON, TTL = kind's lifespan),
  `hz:active` (id set, swept lazily on read), `hz:v:<id>` (voter
  hashes), `hz:rl:<hash>` (fixed-window report counter).
- **In-memory Map** only when `NODE_ENV !== "production"` — lets you
  click through the whole flow locally with no account.
- **Neither** in production → community reports are off: `POST`
  returns 503 and the "Report" button is hidden
  (`configured: false`). `GET` still serves the static seed zones
  and the forecast flood zones (3b) — those don't need a store.

The `HazardStore` interface is storage-agnostic so this can move to
a Supabase table if/when accounts land (see
[USER_ACCOUNTS.md](./USER_ACCOUNTS.md)).

## Kinds & lifespans

| Kind | TTL | Default severity |
| --- | --- | --- |
| `flood` | 6 h | 0.7 |
| `checkpoint` | 3 h | 0.35 |
| `accident_prone` (crash) | 4 h | 0.6 |
| `closure` | 24 h | 0.8 |
| `poor_surface` | 30 d | 0.45 |

Confirm votes nudge severity up (+0.05), clear votes down (−0.15);
`clears − confirms ≥ 3` retires a hazard.

## Abuse & honesty

- Anonymous, but `reporterHash`-rate-limited (5 reports/hour,
  near-duplicate same-kind within 100 m / 30 min rejected → returns
  the existing report so the client just selects it).
- Notes are HTML-stripped and capped at 200 chars.
- Every surface shows the report time and "reported by a driver";
  seed/official zones render dashed and carry a "not a live
  confirmation" note. Aggressive auto-expiry throughout.

### Mid-navigation reroute

`directions-panel.tsx`'s `rerouteFrom(currentPos, avoidHazards)`
recomputes from the driver's live GPS position to the same
destination and swaps the route in place — `applyRoute` sets the
new `liveSteps`, and the hook's `[steps]` effect (already built for
this) restarts step tracking from where the driver is. `MapView`
skips its route `fitBounds` while `isNavigating` so the camera
stays on the driver.

- **Off-route** (driver > 80 m off the line for 15 s): the hook's
  `onRerouteNeeded` — previously just a message — now fires
  `rerouteFrom(pos, [])` (plain recompute, no avoid). Silent; the
  hook's cooldown plus an 8 s local guard limit retries.
- **Closure ahead:** when `hazardAhead.hazard.kind === "closure"`
  and it's ≥ 150 m off, the 2c strip shows a **Reroute** button →
  `rerouteFrom(pos, [that hazard])` (avoid circle around it). Only
  applied if the result clears it; else "Couldn't find a way
  around — it may block the only road." Needs `ORS_API_KEY` like
  3a; without it the OSRM fallback can't dodge the closure and the
  check reports that.

## Not yet built

- A real official feed — GDACS / NADMO / GMet — behind a
  `HazardFeed` interface alongside `forecast-flood.ts`.
- `/api/geo/route-plan`: upgrade its vertex-only `detectHazards` to
  segment-distance, give the Valhalla/GraphHopper engines `steps`,
  and let the panel use it as the routing backend when a premium
  engine is configured.
