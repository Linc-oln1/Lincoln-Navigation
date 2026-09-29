# Lincoln Navigation

**Navigation built for Ghana's roads.** Global map apps struggle with informal addresses ("opposite the old filling station"), flood-prone corridors and sparse place data. Lincoln Navigation combines several map and place providers, scores every route it suggests, and lets drivers warn each other about hazards in real time.

🌍 Live: **[lincolnnavigation.com](https://www.lincolnnavigation.com)**

---

## Features

- **Confidence-scored place search.** Queries Google Places, Foursquare, Mapbox Search and OpenStreetMap in parallel, clusters duplicate results across providers (union-find), and ranks each place by source agreement, freshness and spatial consistency.
- **Multi-engine route scoring.** Requests candidate routes from OSRM, GraphHopper and Valhalla and ranks them with a transparent formula weighing ETA, turn complexity and hazard exposure. Every score is visible, not hidden in a black box.
- **Local landmark directions.** Resolves relative directions such as *"opposite the old filling station"* against OpenStreetMap anchors and returns a coordinate with an explicit uncertainty radius.
- **Community hazard reports.** Drivers flag flooding, checkpoints, bad roads, crashes and closures. Others can confirm or clear them, and reports expire on their own. Routes warn about hazards along the way and offer a safer alternative. Reports are anonymous and rate-limited.
- **Flood and weather awareness.** Current conditions and a 5-day forecast (Open-Meteo, with OpenWeatherMap as an option). Rain forecasts over known flood corridors, plus optional GDACS (UN/EC) alerts.
- **Turn-by-turn navigation** with a navigation camera, speed reading and car, motorbike and bus modes.
- **Live trip sharing and fleet tracking.** Share a live-location link, or manage up to 25 vehicles with daily stats.
- **Offline maps (Premium).** Saves vector tiles for an area to the browser's Cache Storage through a service worker.
- **Street-level imagery** (Mapillary), a traffic layer, saved places and recent searches.
- **Installable PWA** in **16 languages**, including English, Twi, Hausa, Yorùbá, Kiswahili, French, Arabic and Korean.
- **Accounts and billing.** Supabase auth with guest mode, a Paystack premium plan and optional AdSense. All of these are turned on or off with environment variables.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI |
| Maps | MapLibre GL JS, OpenFreeMap vector tiles, Mapillary |
| Routing | OSRM, GraphHopper, Valhalla, OpenRouteService |
| Places & geocoding | Google Places, Foursquare, Mapbox Search, OpenStreetMap / Nominatim |
| Data | Supabase (PostgreSQL + Auth), Upstash Redis |
| Payments | Paystack |
| Hosting | Vercel |

## Architecture

```
lib/geo-intelligence/
├── providers.ts           Place providers behind one interface (each skipped if unkeyed)
├── confidence.ts          Source agreement, freshness decay, spatial clustering, composite score
├── fusion.ts              Cross-provider evidence fusion → canonical, ranked places
├── route-intelligence.ts  Multi-engine routing, hazard-crossing detection, vehicle-aware scoring
├── engine-steps.ts        Normalises each engine's maneuvers into one turn-by-turn format
└── ghana-landmarks.ts     Relative-landmark parsing with calibrated uncertainty radii

app/api/geo/
├── search/       GET  fused, confidence-ranked place search
├── route-plan/   GET  scored route candidates with reasoning
└── landmark/     GET  landmark phrase → coordinate + uncertainty
```

Design write-ups are in [`docs/`](docs):
[Geo-intelligence](docs/GEO_INTELLIGENCE_ARCHITECTURE.md) ·
[Hazards](docs/HAZARDS.md) ·
[Weather](docs/WEATHER.md) ·
[User accounts](docs/USER_ACCOUNTS.md) ·
[Supabase setup](docs/SUPABASE_SETUP.md) ·
[Monetization](docs/MONETIZATION.md)

## Getting started

```bash
git clone https://github.com/Linc-oln1/Lincoln-Navigation.git
cd Lincoln-Navigation
pnpm install
cp .env.example .env.local   # every key is optional
pnpm dev                     # http://localhost:3000
```

The app runs without any API keys. Maps, routing (public OSRM), geocoding and weather use free, keyless services. Each optional key in `.env.example` switches on a better data source or feature, such as extra place providers, GraphHopper or Valhalla routing, hazard storage, accounts or payments.

## Author

**Jonathan Kwaku Abra**, AI & Software Engineering student at Sahmyook University, Seoul.
[LinkedIn](https://www.linkedin.com/in/jonathan-kwaku-abra) · [GitHub](https://github.com/Linc-oln1)
