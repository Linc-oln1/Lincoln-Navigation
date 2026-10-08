// scripts/build-trotro-data.mjs
//
// Turns an extracted Accra trotro GTFS feed into the compact JSON the trip
// planner reads (lib/trotro/accra.json).
//
//   node scripts/build-trotro-data.mjs <folder with the GTFS .txt files>
//
// Source: AFDLab4Dev/AccraMobility GTFS (March 2019), built from OpenStreetMap
// by the Accra Mobile 3 project. © OpenStreetMap contributors, ODbL.
// Only stops that a trip actually uses are kept, and each trip's shape is
// simplified (8 m tolerance) and stored as a Google-style encoded polyline.

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dir = process.argv[2]
if (!dir) {
  console.error("usage: node scripts/build-trotro-data.mjs <gtfs folder>")
  process.exit(1)
}

/** Small CSV reader that handles quoted fields and a BOM. */
function readCsv(file) {
  const text = readFileSync(join(dir, file), "utf8").replace(/^﻿/, "")
  const rows = []
  let row = [], field = "", quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field); field = ""
      if (row.length > 1 || row[0] !== "") rows.push(row)
      row = []
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const head = rows.shift()
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])))
}

const stopsRaw = readCsv("stops.txt")
const routesRaw = readCsv("routes.txt")
const tripsRaw = readCsv("trips.txt")
const timesRaw = readCsv("stop_times.txt")
const shapesRaw = readCsv("shapes.txt")
const freqRaw = readCsv("frequencies.txt")

const secs = (t) => { const [h, m, s] = t.split(":").map(Number); return h * 3600 + m * 60 + (s || 0) }

// ---- shapes: simplify (Douglas-Peucker) then encode ----
const shapes = new Map()
for (const r of shapesRaw) {
  if (!shapes.has(r.shape_id)) shapes.set(r.shape_id, [])
  shapes.get(r.shape_id).push([Number(r.shape_pt_sequence), Number(r.shape_pt_lat), Number(r.shape_pt_lon)])
}
const M_PER_DEG = 111_320
function pointSegDist(p, a, b) {
  const kx = Math.cos((a[0] * Math.PI) / 180) * M_PER_DEG, ky = M_PER_DEG
  const px = (p[1] - a[1]) * kx, py = (p[0] - a[0]) * ky
  const bx = (b[1] - a[1]) * kx, by = (b[0] - a[0]) * ky
  const len2 = bx * bx + by * by
  const t = len2 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0
  return Math.hypot(px - bx * t, py - by * t)
}
function simplify(pts, tol) {
  if (pts.length < 3) return pts
  const keep = new Array(pts.length).fill(false)
  keep[0] = keep[pts.length - 1] = true
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()
    let maxD = 0, idx = -1
    for (let i = s + 1; i < e; i++) {
      const d = pointSegDist(pts[i], pts[s], pts[e])
      if (d > maxD) { maxD = d; idx = i }
    }
    if (maxD > tol) { keep[idx] = true; stack.push([s, idx], [idx, e]) }
  }
  return pts.filter((_, i) => keep[i])
}
function encodePolyline(pts) {
  let out = "", pLat = 0, pLng = 0
  const enc = (v) => {
    v = v < 0 ? ~(v << 1) : v << 1
    let s = ""
    while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5 }
    return s + String.fromCharCode(v + 63)
  }
  for (const [la, ln] of pts) {
    const a = Math.round(la * 1e5), b = Math.round(ln * 1e5)
    out += enc(a - pLat) + enc(b - pLng)
    pLat = a; pLng = b
  }
  return out
}
const encodedShapes = new Map()
for (const [id, pts] of shapes) {
  pts.sort((a, b) => a[0] - b[0])
  encodedShapes.set(id, encodePolyline(simplify(pts.map((p) => [p[1], p[2]]), 8)))
}

// ---- stops used by trips, re-indexed ----
const timesByTrip = new Map()
for (const r of timesRaw) {
  if (!timesByTrip.has(r.trip_id)) timesByTrip.set(r.trip_id, [])
  timesByTrip.get(r.trip_id).push(r)
}
const usedStopIds = new Set(timesRaw.map((r) => r.stop_id))
const stopIndex = new Map()
const stops = []
for (const s of stopsRaw) {
  if (!usedStopIds.has(s.stop_id)) continue
  stopIndex.set(s.stop_id, stops.length)
  stops.push([s.stop_name.trim(), Math.round(Number(s.stop_lat) * 1e5) / 1e5, Math.round(Number(s.stop_lon) * 1e5) / 1e5])
}

// ---- lines ----
const headwayByTrip = new Map(freqRaw.map((f) => [f.trip_id, Math.round(Number(f.headway_secs) / 60)]))
const lines = []
for (const route of routesRaw) {
  const trips = tripsRaw.filter((t) => t.route_id === route.route_id)
  const outTrips = []
  for (const t of trips) {
    const rows = (timesByTrip.get(t.trip_id) ?? []).sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
    if (rows.length < 2) continue
    const t0 = secs(rows[0].arrival_time)
    outTrips.push({
      headsign: t.trip_headsign.trim(),
      stops: rows.map((r) => stopIndex.get(r.stop_id)),
      mins: rows.map((r) => Math.round(((secs(r.arrival_time) - t0) / 60) * 10) / 10),
      shape: encodedShapes.get(t.shape_id) ?? "",
      headway: headwayByTrip.get(t.trip_id) ?? null,
    })
  }
  if (outTrips.length) lines.push({ ref: route.route_short_name.trim(), name: route.route_long_name.trim(), trips: outTrips })
}

const out = {
  source: "OpenStreetMap Ghana / Accra Mobile 3 GTFS (AFDLab4Dev/AccraMobility)",
  feedDate: "2019-03-04",
  licence: "ODbL, © OpenStreetMap contributors",
  stops,
  lines,
}
writeFileSync(new URL("../lib/trotro/accra.json", import.meta.url), JSON.stringify(out))
const km = JSON.stringify(out).length / 1024
console.log(`stops ${stops.length}, lines ${lines.length}, trips ${lines.reduce((n, l) => n + l.trips.length, 0)}, ${km.toFixed(0)} KB`)
