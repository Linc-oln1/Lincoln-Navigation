// lib/geo-intelligence/engine-steps.ts  (server only)
//
// Maps GraphHopper / Valhalla maneuver data onto the same RouteStep
// shape OSRM (and the rest of the app) already speaks, so
// planRoutes() returns real turn-by-turn regardless of which engine
// answered. See lib/routing.ts for the RouteStep contract and the
// OSRM side of this mapping.

import type { Coordinate, RouteStep } from "../routing"
import type { LatLng } from "./types"

type Maneuver = RouteStep["maneuver"]

/* =========================================================
   GRAPHHOPPER

   instructions[]: { text, street_name, distance (m), time (ms),
   sign, interval: [startIdx, endIdx] }. Points are GeoJSON
   [lng, lat]. Sign codes: 0 continue, ±1 slight, ±2 turn, ±3
   sharp, ±7 keep, ±8 u-turn, 4 arrive, 5 via, 6 roundabout.
========================================================= */

function graphHopperManeuver(sign: number): { type: string; modifier?: string } {
  switch (sign) {
    case 0:
    case 5:
      return { type: "continue" }
    case 1:
      return { type: "turn", modifier: "slight right" }
    case -1:
      return { type: "turn", modifier: "slight left" }
    case 2:
      return { type: "turn", modifier: "right" }
    case -2:
      return { type: "turn", modifier: "left" }
    // ±7 = "keep right/left" — a lane fork, not a turn. Match OSRM's
    // "fork" so turn-complexity scoring treats it the same across engines.
    case 7:
      return { type: "fork", modifier: "slight right" }
    case -7:
      return { type: "fork", modifier: "slight left" }
    case 3:
      return { type: "turn", modifier: "sharp right" }
    case -3:
      return { type: "turn", modifier: "sharp left" }
    case 8:
    case -8:
      return { type: "uturn" }
    case 4:
      return { type: "arrive" }
    case 6:
      return { type: "roundabout" }
    default:
      return { type: "continue" }
  }
}

export function graphHopperSteps(path: any): RouteStep[] {
  const coords: Coordinate[] = path?.points?.coordinates ?? []
  const instructions: any[] = Array.isArray(path?.instructions)
    ? path.instructions
    : []

  return instructions.map((instr): RouteStep => {
    const [from, to] = Array.isArray(instr.interval)
      ? instr.interval
      : [0, Math.max(0, coords.length - 1)]
    const geometry = coords.slice(from, to + 1)
    const m = graphHopperManeuver(Number(instr.sign ?? 0))

    return {
      distance: Number(instr.distance ?? 0),
      duration: Number(instr.time ?? 0) / 1000,
      name:
        instr.street_name && instr.street_name !== "-" ? instr.street_name : "",
      instruction:
        typeof instr.text === "string" && instr.text ? instr.text : "Continue",
      maneuver: {
        type: m.type,
        modifier: m.modifier,
        location: geometry[0] ?? coords[0] ?? [0, 0],
      } as Maneuver,
      geometry: { type: "LineString", coordinates: geometry },
      voiceInstruction:
        typeof instr.text === "string" && instr.text ? instr.text : undefined,
    }
  })
}

/* =========================================================
   VALHALLA

   trip.legs[].maneuvers[]: { type, instruction,
   verbal_pre_transition_instruction, street_names, length (km),
   time (s), begin_shape_index, end_shape_index }. Geometry is the
   decoded leg shape (LatLng[]).
========================================================= */

function valhallaManeuver(type: number): { type: string; modifier?: string } {
  switch (type) {
    case 1:
    case 2:
    case 3:
      return { type: "depart" }
    case 4:
    case 5:
    case 6:
      return { type: "arrive" }
    case 9:
      return { type: "turn", modifier: "slight right" }
    case 16:
      return { type: "turn", modifier: "slight left" }
    case 10:
    case 18:
    case 20:
    case 23:
      return { type: "turn", modifier: "right" }
    case 15:
    case 19:
    case 21:
    case 24:
      return { type: "turn", modifier: "left" }
    case 11:
      return { type: "turn", modifier: "sharp right" }
    case 14:
      return { type: "turn", modifier: "sharp left" }
    case 12:
    case 13:
      return { type: "uturn" }
    case 25:
      return { type: "merge" }
    case 26:
    case 27:
      return { type: "roundabout" }
    default:
      return { type: "continue" }
  }
}

export function valhallaSteps(
  legs: any[],
  geometryByLeg: LatLng[][]
): RouteStep[] {
  const out: RouteStep[] = []

  legs.forEach((leg, legIdx) => {
    const shape = geometryByLeg[legIdx] ?? []
    const maneuvers: any[] = Array.isArray(leg?.maneuvers) ? leg.maneuvers : []

    for (const mv of maneuvers) {
      const from = Number(mv.begin_shape_index ?? 0)
      const to = Number(mv.end_shape_index ?? shape.length - 1)
      const slice = shape
        .slice(from, to + 1)
        .map((p) => [p.lng, p.lat] as Coordinate)
      const m = valhallaManeuver(Number(mv.type ?? 0))

      out.push({
        distance: Number(mv.length ?? 0) * 1000,
        duration: Number(mv.time ?? 0),
        name: Array.isArray(mv.street_names) ? mv.street_names[0] ?? "" : "",
        instruction:
          typeof mv.instruction === "string" && mv.instruction
            ? mv.instruction
            : "Continue",
        maneuver: {
          type: m.type,
          modifier: m.modifier,
          location: slice[0] ?? [0, 0],
        } as Maneuver,
        geometry: { type: "LineString", coordinates: slice },
        voiceInstruction:
          mv.verbal_pre_transition_instruction ||
          mv.instruction ||
          undefined,
      })
    }
  })

  return out
}
