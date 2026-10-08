// lib/trotro/types.ts — shapes shared by the trotro trip planner (server) and the screen that shows it.

export type LatLng = [number, number] // [lat, lng]

export interface TrotroPlace {
  name: string
  lat: number
  lng: number
}

export interface WalkLeg {
  type: "walk"
  from: TrotroPlace
  to: TrotroPlace
  minutes: number
  meters: number
}

export interface RideLeg {
  type: "ride"
  /** Line number painted on the trotro, e.g. "11". */
  ref: string
  /** Both ends of the line, e.g. "Circle ↔ Abeka Lapaz". */
  lineName: string
  /** Where this direction is heading, e.g. "Abeka Lapaz". */
  headsign: string
  board: TrotroPlace
  alight: TrotroPlace
  stops: number
  minutes: number
  /** The road between boarding and getting off, for drawing on the map. */
  path: LatLng[]
}

export type Leg = WalkLeg | RideLeg

export interface Itinerary {
  totalMinutes: number
  walkMinutes: number
  rideMinutes: number
  waitMinutes: number
  transfers: number
  legs: Leg[]
}

export interface TrotroPlan {
  /** False when the start or end is too far from any mapped trotro stop. */
  covered: boolean
  itineraries: Itinerary[]
  /** Straight-line walk, when the trip is short enough to walk. */
  walkOnlyMinutes: number | null
  /** Where the data comes from and how old it is, for the screen to show. */
  dataNote: { source: string; feedDate: string; licence: string }
}
