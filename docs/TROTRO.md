# Trotro trip planner (beta, hidden)

Plans a trotro trip in Accra: which lines to take, direct or with one change.
Written 8 Oct 2026. Hidden from everyone except admins until you switch it on.

## What it is

- **Data:** `lib/trotro/accra.json` (306 KB): 2,525 stops, 277 lines, 554 directions, with route shapes.
  Built from the Accra Mobile 3 GTFS (OpenStreetMap Ghana, feed dated 4 Mar 2019, mapped in 2017).
  Licence ODbL, (c) OpenStreetMap contributors. Credited on `/attributions` and on the card itself.
- **Planner:** `lib/trotro/planner.ts`. Finds direct trips and trips with one change.
  Runs in about 5 ms. No external service.
- **API:** `GET /api/trotro/plan?from=lat,lng&to=lat,lng` (rate limited to 60 a minute per visitor).
- **Screen:** `components/map/trotro-plan-card.tsx`, shown in the directions panel in **Bus** mode.
  Shows up to 3 options, the line numbers, step-by-step text, and draws the chosen trip on the map.

## Switching it on

- It is **off for everyone except admins** (the emails in `ADMIN_EMAILS`). Sign in as an admin, open
  the map, choose Bus mode, enter a start and a destination in Accra.
- To turn it on for everyone, set `TROTRO_PLANNER=1` in Vercel (Production) and redeploy.
  Switch it off again by removing the variable.
- When it is off for a visitor, the API answers 404 and the card renders nothing, so Bus mode
  looks exactly as it did before.

## What it cannot do (be honest about this)

- **The lines are old.** Mapped in 2017, feed dated 2019. Lines and stations change. Check the busiest
  lines with riders before switching it on (see `docs/OWNER_CHECKLIST.md`).
- **Times are guesses.** There are no real timetables or fares. Riding time comes from the mapped stop
  spacing, waiting is a flat 8 minutes per trotro, walking is straight line with a detour factor.
- **Accra only.** Anywhere else it says the area is not covered.
- **One change at most.** Some trips need two (for example Circle to Madina) and return "no route found".
- No live data, no fares, no schedules, no walking directions on real footpaths.

## Refreshing the data

1. Get a newer Accra GTFS (the Trufi Association 2023 build mentions 365 lines, or rebuild from
   OpenStreetMap with OSM2GTFS: https://wiki.openstreetmap.org/wiki/OSM2GTFS_for_Accra_-_user_manual).
2. Unzip it, then run: `node scripts/build-trotro-data.mjs <folder with the .txt files>`
3. Check `lib/trotro/accra.json` changed, run `pnpm build`, and test a few trips as an admin.

## Before switching it on for everyone

- [ ] Riders confirm the 10 busiest lines still exist and use the same stations.
- [ ] Read the card text once and decide if the wording is right (it is English only for now).
- [ ] Decide whether to translate it (the rest of the map is in 16 languages).
- [ ] Legal: ODbL share-alike applies if you ever redistribute the dataset itself. Showing trip results is fine.
