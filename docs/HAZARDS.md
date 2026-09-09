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
- **Neither** in production → the feature is off: `GET` still
  returns the static seed zones (read-only), `POST` returns 503,
  and the "Report" button is hidden (`configured: false`).

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

## Not yet built

- **Phase 3** — real avoidance re-routing (needs Valhalla
  `exclude_locations` / GraphHopper `block_area`; engine classes
  exist but are env-gated). Official NADMO / Hydrological Services
  feed adapter behind the same store interface.
