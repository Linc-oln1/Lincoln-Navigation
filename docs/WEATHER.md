# Weather

The map shows current conditions + a 5-day forecast for whatever
area it's looking at. Works out of the box — no API key required.

## Pieces

| File | Role |
| --- | --- |
| [`app/api/weather/route.ts`](../app/api/weather/route.ts) | Server proxy. `GET /api/weather?lat=&lng=` → normalized JSON. |
| [`lib/weather.ts`](../lib/weather.ts) | Client fetch helper + WMO weather-code → label/condition/emoji table + local-time formatters. |
| [`hooks/use-weather.ts`](../hooks/use-weather.ts) | Fetches for the map center; refetches on a >~16 km move, refreshes every 15 min. |
| [`components/map/weather-widget.tsx`](../components/map/weather-widget.tsx) | Collapsed temperature pill (top-left, below the header) that expands to the full card. |

The widget reads `weatherCenter` in [`app/app/page.tsx`](../app/app/page.tsx),
which tracks the map center as the user pans (via `MapView`'s new
`onCenterChange`, fired only on user-initiated `moveend`) without
feeding back into the map camera.

## Providers

Same "free provider works, paid key is an upgrade" pattern as
`/api/geocode` and `/api/places`:

- **Default — [Open-Meteo](https://open-meteo.com):** free, keyless,
  no attribution burden. This is what runs in production.
- **Upgrade — [OpenWeatherMap](https://openweathermap.org/api):** set
  `OPENWEATHER_API_KEY` and it's queried first, with Open-Meteo as
  the fallback. Free tier is enough. Its condition codes are mapped
  onto the same WMO code table so the UI stays provider-agnostic.

Responses are cached in-process for 10 minutes on a ~0.1° grid, so
panning doesn't hammer either provider.

All timestamps are returned as UTC ISO strings plus
`utcOffsetSeconds`; the widget formats hours/days in the *map
location's* local time, not the viewer's.
