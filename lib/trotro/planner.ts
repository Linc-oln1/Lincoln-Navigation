// lib/trotro/planner.ts  (server only)
//
// Trotro trip planner for Accra: given a start and an end, finds which
// trotro lines to take (direct, or with one change) using the mapped lines in
// lib/trotro/accra.json. The data is community-mapped (OpenStreetMap, 2017 to
// 2019) and has no real timetables, so every time here is an ESTIMATE:
// riding time comes from the mapped stop spacing, waiting is a flat guess,
// and walking is straight-line distance with a detour factor.

import raw from "./accra.json"
import { decodePolyline } from "./polyline"
import type { Itinerary, LatLng, Leg, RideLeg, TrotroPlace, TrotroPlan } from "./types"

interface RawTrip {
  headsign: string
  stops: number[]
  mins: number[]
  shape: string
  headway: number | null
}
interface RawLine {
  ref: string
  name: string
  trips: RawTrip[]
}
const DATA = raw as unknown as {
  source: string
  feedDate: string
  licence: string
  stops: [string, number, number][]
  lines: RawLine[]
}

const WALK_M_PER_MIN = 80 // about 4.8 km/h
const DETOUR = 1.3 // straight line to real walking distance
const NEAR_WALK_M = 900
const FAR_WALK_M = 1500
const MAX_CANDIDATES = 8
const TRANSFER_WALK_M = 250
const TRANSFER_WALK_FALLBACK_M = 450 // used only when nothing is found with the short walk
const WAIT_MIN = 8 // trotros leave when full; a flat estimate
const TRANSFER_PENALTY_MIN = 4 // people dislike changing, so rank it worse
const MAX_STOPS_AHEAD = 90 // longer than any mapped line, so no change point is skipped
const MIN_RIDE_BEFORE_CHANGE_MIN = 4 // a 1-minute ride is a walk, not a trotro

/* ------------------------------ indexes ------------------------------ */

interface Trip {
  id: number
  lineRef: string
  lineName: string
  headsign: string
  stops: number[]
  mins: number[]
  shape: string
}

const TRIPS: Trip[] = []
const STOP_TRIPS: [number, number][][] = DATA.stops.map(() => []) // stop -> [tripId, position]
DATA.lines.forEach((line) => {
  line.trips.forEach((t) => {
    const trip: Trip = {
      id: TRIPS.length,
      lineRef: line.ref,
      lineName: line.name,
      headsign: t.headsign,
      stops: t.stops,
      mins: t.mins,
      shape: t.shape,
    }
    TRIPS.push(trip)
    trip.stops.forEach((s, pos) => STOP_TRIPS[s]?.push([trip.id, pos]))
  })
})

// Grid of stops for "stops within a short walk of this stop".
const CELL = 0.0025
const cellOf = (lat: number, lng: number) => `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`
const GRID = new Map<string, number[]>()
DATA.stops.forEach(([, lat, lng], i) => {
  const key = cellOf(lat, lng)
  const cell = GRID.get(key)
  if (cell) cell.push(i)
  else GRID.set(key, [i])
})

/* ------------------------------ helpers ------------------------------ */

function metres(a: LatLng, b: LatLng): number {
  const R = 6371000, p = Math.PI / 180
  const x = Math.sin(((b[0] - a[0]) * p) / 2) ** 2 + Math.cos(a[0] * p) * Math.cos(b[0] * p) * Math.sin(((b[1] - a[1]) * p) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
const stopLL = (i: number): LatLng => [DATA.stops[i]![1], DATA.stops[i]![2]]
const place = (i: number): TrotroPlace => ({ name: DATA.stops[i]![0], lat: DATA.stops[i]![1], lng: DATA.stops[i]![2] })
const walkMin = (m: number) => Math.max(1, Math.round((m * DETOUR) / WALK_M_PER_MIN))

/** Stops within `maxM` of a point, nearest first. */
function stopsNear(p: LatLng, maxM: number, limit = Infinity): { stop: number; m: number }[] {
  const out: { stop: number; m: number }[] = []
  const r = Math.ceil(maxM / (CELL * 111_320)) + 1
  const cy = Math.floor(p[0] / CELL), cx = Math.floor(p[1] / CELL)
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      for (const s of GRID.get(`${cy + dy}:${cx + dx}`) ?? []) {
        const m = metres(p, stopLL(s))
        if (m <= maxM) out.push({ stop: s, m })
      }
    }
  }
  out.sort((a, b) => a.m - b.m)
  return out.slice(0, limit)
}

const shapeCache = new Map<number, LatLng[]>()
function shapeOf(trip: Trip): LatLng[] {
  let s = shapeCache.get(trip.id)
  if (!s) {
    s = trip.shape ? decodePolyline(trip.shape) : []
    shapeCache.set(trip.id, s)
  }
  return s
}

/** The road a trotro follows between two of its stops. */
function ridePath(trip: Trip, fromPos: number, toPos: number): LatLng[] {
  const a = stopLL(trip.stops[fromPos]!), b = stopLL(trip.stops[toPos]!)
  const shape = shapeOf(trip)
  if (shape.length >= 2) {
    const nearest = (p: LatLng, from: number) => {
      let best = from, bestD = Infinity
      for (let i = from; i < shape.length; i++) {
        const d = metres(p, shape[i]!)
        if (d < bestD) { bestD = d; best = i }
      }
      return best
    }
    const i = nearest(a, 0)
    const j = nearest(b, i)
    if (j > i) return [a, ...shape.slice(i, j + 1), b]
  }
  // No usable shape: join the stops in order.
  return trip.stops.slice(fromPos, toPos + 1).map(stopLL)
}

function rideLeg(trip: Trip, fromPos: number, toPos: number): RideLeg {
  return {
    type: "ride",
    ref: trip.lineRef,
    lineName: trip.lineName,
    headsign: trip.headsign,
    board: place(trip.stops[fromPos]!),
    alight: place(trip.stops[toPos]!),
    stops: toPos - fromPos,
    minutes: Math.max(1, Math.round(trip.mins[toPos]! - trip.mins[fromPos]!)),
    path: ridePath(trip, fromPos, toPos),
  }
}

/* ------------------------------- planner ------------------------------ */

export interface PlanOptions {
  fromName?: string
  toName?: string
}

export function planTrotro(from: LatLng, to: LatLng, opts: PlanOptions = {}): TrotroPlan {
  const first = plan(from, to, opts, TRANSFER_WALK_M)
  if (first.covered && first.itineraries.length === 0) return plan(from, to, opts, TRANSFER_WALK_FALLBACK_M)
  return first
}

function plan(from: LatLng, to: LatLng, opts: PlanOptions, transferWalkM: number): TrotroPlan {
  const dataNote = { source: DATA.source, feedDate: DATA.feedDate, licence: DATA.licence }
  const direct = metres(from, to)
  const walkOnlyMinutes = direct <= 1500 ? walkMin(direct) : null

  const radiusFor = (p: LatLng) => {
    const nearest = stopsNear(p, FAR_WALK_M, 1)[0]
    if (!nearest) return null
    return nearest.m <= NEAR_WALK_M ? NEAR_WALK_M : FAR_WALK_M
  }
  const rFrom = radiusFor(from), rTo = radiusFor(to)
  if (!rFrom || !rTo) return { covered: false, itineraries: [], walkOnlyMinutes, dataNote }

  const origins = stopsNear(from, rFrom, MAX_CANDIDATES)
  const dests = stopsNear(to, rTo, MAX_CANDIDATES)

  // trip -> the places along it where this journey can end
  const endsByTrip = new Map<number, { pos: number; m: number }[]>()
  for (const d of dests) {
    for (const [tripId, pos] of STOP_TRIPS[d.stop]!) {
      const list = endsByTrip.get(tripId)
      if (list) list.push({ pos, m: d.m })
      else endsByTrip.set(tripId, [{ pos, m: d.m }])
    }
  }

  const startPlace: TrotroPlace = { name: opts.fromName || "Start", lat: from[0], lng: from[1] }
  const endPlace: TrotroPlace = { name: opts.toName || "Destination", lat: to[0], lng: to[1] }
  const walkLeg = (a: TrotroPlace, b: TrotroPlace, m: number): Leg => ({ type: "walk", from: a, to: b, minutes: walkMin(m), meters: Math.round(m * DETOUR) })

  const best = new Map<string, { score: number; build: () => Itinerary }>()
  const offer = (key: string, score: number, build: () => Itinerary) => {
    const cur = best.get(key)
    if (!cur || score < cur.score) best.set(key, { score, build })
  }

  const finish = (legs: Leg[], transfers: number): Itinerary => {
    let walk = 0, ride = 0
    for (const l of legs) {
      if (l.type === "walk") walk += l.minutes
      else ride += l.minutes
    }
    const wait = WAIT_MIN * (transfers + 1)
    return { totalMinutes: walk + ride + wait, walkMinutes: walk, rideMinutes: ride, waitMinutes: wait, transfers, legs }
  }

  for (const o of origins) {
    for (const [aId, i] of STOP_TRIPS[o.stop]!) {
      const A = TRIPS[aId]!
      const lastK = Math.min(A.stops.length - 1, i + MAX_STOPS_AHEAD)

      // Direct: the same trotro takes you close to where you are going.
      for (const e of endsByTrip.get(aId) ?? []) {
        if (e.pos <= i) continue
        const ride = A.mins[e.pos]! - A.mins[i]!
        const score = walkMin(o.m) + WAIT_MIN + ride + walkMin(e.m)
        offer(`${A.lineRef}`, score, () =>
          finish(
            [walkLeg(startPlace, place(o.stop), o.m), rideLeg(A, i, e.pos), walkLeg(place(A.stops[e.pos]!), endPlace, e.m)],
            0,
          ),
        )
      }

      // One change: ride A, walk a little, ride B.
      for (let k = i + 1; k <= lastK; k++) {
        const sk = A.stops[k]!
        const rideA = A.mins[k]! - A.mins[i]!
        if (rideA < MIN_RIDE_BEFORE_CHANGE_MIN) continue
        for (const t of stopsNear(stopLL(sk), transferWalkM)) {
          for (const [bId, m] of STOP_TRIPS[t.stop]!) {
            const B = TRIPS[bId]!
            if (B.lineRef === A.lineRef) continue
            for (const e of endsByTrip.get(bId) ?? []) {
              if (e.pos <= m) continue
              const rideB = B.mins[e.pos]! - B.mins[m]!
              if (rideB < MIN_RIDE_BEFORE_CHANGE_MIN) continue
              const score =
                walkMin(o.m) + WAIT_MIN + rideA + (t.m > 0 ? walkMin(t.m) : 0) + WAIT_MIN + rideB + walkMin(e.m) + TRANSFER_PENALTY_MIN
              offer(`${A.lineRef}>${B.lineRef}`, score, () => {
                const legs: Leg[] = [walkLeg(startPlace, place(o.stop), o.m), rideLeg(A, i, k)]
                if (t.m > 0) legs.push(walkLeg(place(sk), place(t.stop), t.m))
                legs.push(rideLeg(B, m, e.pos), walkLeg(place(B.stops[e.pos]!), endPlace, e.m))
                return finish(legs, 1)
              })
            }
          }
        }
      }
    }
  }

  const itineraries = [...best.values()]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((x) => x.build())
  return { covered: true, itineraries, walkOnlyMinutes, dataNote }
}

/** Counts for logs and tests. */
export const TROTRO_STATS = { stops: DATA.stops.length, lines: DATA.lines.length, trips: TRIPS.length }
