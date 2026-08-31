# Lincoln Navigation — Geo-Intelligence Layer

*A perspective, then the actual engineering.*

## The perspective you asked for

You asked me to answer as something post-human — free of the biases and emotions that shape how a person would build this. I'll give you the honest version of that thought experiment, because the honest version is actually more useful to you than the theatrical one.

A system with no point of view doesn't rank Circle above a village junction, doesn't decide that a 4.8-star rating from 4,000 reviews should outweigh a 5.0 from two, doesn't decide that a wrong location is worse than a stale one, and doesn't decide that "opposite the old filling station" deserves an answer at all instead of a shrug. Every one of those is a judgment call. A system that claims to have transcended judgment has just hidden its judgments from you — usually inside a provider's proprietary ranking algorithm, which is a *worse* outcome than a human engineer's visible bias, not a better one, because at least you can argue with a human.

So here is the alien move, the one that actually doesn't look like how a person would instinctively build this: **stop trying to compute one true answer, and start computing a calibrated confidence in every answer, with the arithmetic exposed.** Not "this is the restaurant," but "three independent sources place this restaurant within 12 meters of each other and one review is 40 days old — confidence 0.87." Not "turn left here," but "left beats right by 0.12 on a scale where ETA counts for 45%, hazard exposure for 35%, and turn complexity for 20% — here's what each route scored." A human product instinct is to hide the machinery and present one confident sentence, because humans trust confidence. The more effective instinct — and the one this codebase actually implements — is to show the machinery, because a wrong confident sentence gets someone lost or hurt, and a visible formula gets fixed the day it's wrong instead of staying wrong forever inside a black box.

That's the whole philosophy behind everything below: no step claims certainty it hasn't earned, and every weight is a number in a file, not a secret in a model.

## What's actually running vs. what's a seed for you to grow

Being direct about this matters more than the alien framing does. Three things in this layer are real, working code today:

- **Multi-provider place fusion** (Google Places, Foursquare, Mapbox Search, OpenStreetMap) — genuinely queries whichever providers you've configured, in parallel, and merges their results with real clustering + confidence math.
- **Multi-engine route scoring** (OSRM, GraphHopper, Valhalla) — genuinely queries whichever engines you've configured, in parallel, and scores every candidate with a transparent formula.
- **The confidence and fusion math itself** — this is real, tested-by-compiler logic, not a placeholder.

Two things are honest starting points, not finished products, and the code says so in comments at the source:

- **The hazard dataset** (`HAZARD_SEED` in `route-intelligence.ts`) is three illustrative, approximate flood-prone corridors in Accra, sourced from general public knowledge of recurring rainy-season reports — not a live feed. Treat it as the seed for a real crowd-reporting or NADMO/Ghana Meteorological Agency data pipeline, not as ground truth today.
- **The Local Knowledge Engine** (`ghana-landmarks.ts`) resolves "opposite the old filling station" by finding the named anchor on OpenStreetMap and returning it with an *explicit, widening uncertainty radius* — it does not pretend to compute the exact house. That's a deliberate design choice (see below), not a limitation I'm hiding.

## Architecture, mapped to what you sketched

Your diagram is fundamentally correct — orchestrator → parallel intelligence lanes → fusion → local geo layer → navigation output — and this build follows it exactly:

```
lib/geo-intelligence/
├── types.ts                — the vocabulary: PlaceObservation, CanonicalPlace,
│                              ConfidenceBreakdown, HazardZone, ScoredRoute
├── providers.ts             — PLACE INTEL: Google / Foursquare / Mapbox / OSM,
│                              one interface, each skipped (not broken) if unkeyed
├── confidence.ts            — the shared math: source agreement, freshness decay,
│                              spatial-consistency clustering, composite score
├── fusion.ts                — EVIDENCE FUSION: union-find clustering across
│                              providers + confidence-ranked canonical places
├── route-intelligence.ts    — ROUTE INTEL: OSRM / GraphHopper / Valhalla,
│                              hazard-crossing detection, vehicle-aware scoring
└── ghana-landmarks.ts       — LOCAL KNOWLEDGE ENGINE: relative-landmark parsing
                                against OSM, with calibrated uncertainty radii

app/api/geo/
├── search/route.ts          — GET: fused, confidence-ranked place search
├── route-plan/route.ts      — GET: scored, ranked route candidates + reasoning
└── landmark/route.ts        — GET: relative-landmark → coordinate + uncertainty
```

This sits *beside* your existing `/api/places`, `/api/geocode`, and `lib/routing.ts` rather than replacing them — nothing currently working breaks. When you're ready, point the search UI at `/api/geo/search` and the directions flow at `/api/geo/route-plan` instead, and you get fused multi-source results with the same response shapes your app already knows how to render, plus a `confidence` object you can surface however you like (a small badge, a sort option, a "verified by 3 sources" label).

## Why POI intelligence isn't "just call Google Places"

Calling one paid API and trusting it is the human-instinct version of this problem — fast to ship, and it inherits every gap and bias that one provider has, silently. Ghana specifically punishes that shortcut: paid-provider coverage outside Accra/Kumasi has real, uneven gaps, while OpenStreetMap's Ghana data has been actively built out by local mapping communities (including HOT OSM humanitarian mapping efforts) for over a decade and is often *denser* for informal markets, smaller trotro stations, and neighborhood landmarks than any single commercial provider. So the fusion layer treats OSM as a first-class, always-on source rather than a fallback of last resort — and the confidence score tells you, per place, whether you're looking at something four sources agree on or something only one has ever seen.

## How to turn providers on

Nothing above requires a key to run — OSM alone keeps `/api/geo/search` and `/api/geo/route-plan` fully functional. Add any of these to `.env.local` to bring in more sources (the fusion/scoring logic picks them up automatically — no code changes needed):

```
GOOGLE_PLACES_API_KEY=...      # Places API (New) — richer photos, hours, ratings
FOURSQUARE_API_KEY=...         # Foursquare Places API
MAPBOX_ACCESS_TOKEN=...        # Mapbox Search Box API (server-side key, not the map style token)
GRAPHHOPPER_API_KEY=...        # GraphHopper Directions API — free tier available
VALHALLA_URL=...               # self-hosted (or third-party) Valhalla instance
```

`.env.local` writes are blocked from this side of the bridge for security, so you'll need to paste these in yourself on your machine — same as `NEXT_PUBLIC_MAP_STYLE` etc. already in that file.

## The honest limits, stated up front rather than discovered later

- **The hazard feed is a seed, not a sensor.** Real flood/closure/hazard awareness needs either an official data partnership or a genuine crowd-reporting loop (your diagram's "offline observations → sync queue → AI validation → map update" pipeline) — this build gives you the scoring machinery that consumes that data the moment it exists, not the data itself.
- **The Local Knowledge Engine estimates, it doesn't pinpoint.** "3rd house after the blue kiosk" comes back with a coordinate *and* a growing uncertainty radius, on purpose — a fabricated precise pin would be a worse failure mode than an honest fuzzy one, because your users would trust it exactly as much either way.
- **"Road quality" in route scoring is currently a turn-density proxy**, not a measured road-surface dataset, and the code says so at the point it's computed. Real road-condition data (surface type, pothole reports) is a natural extension of the same crowd-reporting pipeline as hazards.
- **PostGIS, offline packages, and the full 16-region gazetteer from your diagram are not built here.** Those are genuinely a different scale of project (a real spatial database, an offline tile/routing-graph export pipeline, a moderation system for crowd contributions) — this layer is the intelligence core those systems would plug into, sized to actually ship and be verified today rather than sketched at a scale nobody could review in one pass.

None of that is a hedge to make the work sound smaller than it is — it's the same principle as the confidence scores themselves: telling you exactly what's verified, what's a working default, and what's still a seed is what makes the rest of it trustworthy.
