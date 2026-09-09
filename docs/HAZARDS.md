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
| [`lib/hazard-geometry.ts`](../lib/hazard-geometry.ts) | Client-safe: `routeBBox`, `hazardsOnRoute` (point-to-segment proximity + distance-along-route), `alongRouteLabel`. |
| [`hooks/use-route-hazards.ts`](../hooks/use-route-hazards.ts) | Given a calculated route, fetches `/api/hazards` for its bbox once and filters to the ones on the line. |
| [`components/map/route-hazard-warning.tsx`](../components/map/route-hazard-warning.tsx) | Collapsible "N hazards on this route" banner in the directions panel. |

`MapView` gained `onBoundsChange`, `hazards`, `selectedHazardId`,
`onHazardSelect` and `onUserLocationChange`; `app/app/page.tsx`
wires the layer, the FAB, the sheet and the details card.

## Phase 2a — hazards on a route

After the directions panel calculates a route it runs
`useRouteHazards` on the polyline and shows `RouteHazardWarning`
above the turn-by-turn list — each hazard with its kind, report
age and distance along the route. Red when a `closure` or a
severity ≥ 0.7 hazard is on the line, amber otherwise. Tapping a
row calls `onFocusHazard` → `app/app/page.tsx` highlights the
marker and recenters the map (the directions panel stays open, so
the full `HazardDetails` card doesn't show — the row already
carries the summary).

No routing-logic changes: the route still comes from
`calculateRoute` (OSRM), and the warning is advisory only. The
hook keys on the route's endpoints, so a hazard reported *after* a
route is calculated only shows once the route is recalculated.

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

- **Phase 2b** — offer a safer alternative route: `calculateRoute`
  with `alternatives: true`, score each against the hazards
  (extract `scoreRoutes` from `route-intelligence.ts` into a
  client-safe module), and prompt "a route avoiding X is N min
  longer". Default stays the fastest route. Also merge
  `getHazardStore().listActive()` into `/api/geo/route-plan` so
  that endpoint scores against live crowd data.
- **Phase 2c** — live-navigation "hazard ahead" detection in
  `use-live-navigation.ts`: on-screen strip (free) + spoken alert
  (Premium, via the existing `speakNavigation`).
- **Phase 3** — real avoidance re-routing (needs Valhalla
  `exclude_locations` / GraphHopper `block_area`; engine classes
  exist but are env-gated). Official NADMO / Hydrological Services
  feed adapter behind the same store interface.
