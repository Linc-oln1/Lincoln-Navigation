// lib/route-scoring.ts
//
// The route-scoring *formula* — ETA vs turn complexity vs hazard
// exposure, weighted per vehicle. Pure arithmetic on a normalized
// shape, no geometry and no hazard types, so both callers can share
// it:
//
//   - lib/geo-intelligence/route-intelligence.ts (server) feeds it
//     RouteCandidate durations / turn counts / HazardZone severities.
//   - components/map/directions-panel.tsx (client) feeds it OSRM
//     Route durations / step-derived turn counts / on-route Hazard
//     severities.
//
// The weights are a deliberate value judgement (see the design note
// in lib/geo-intelligence/types.ts): written down as numbers you can
// read and tune, not hidden in a model.

export type ScoreVehicle =
  | "car"
  | "motorcycle"
  | "bus"
  | "walking"
  | "cycling"

export interface ScoreInput {
  id: string
  durationSeconds: number
  turnCount: number
  /** Σ severity (0–1 each) of the hazards on this route. */
  hazardSeverityTotal: number
  hazardCount: number
  /** Highest single-hazard severity on this route (0–1). */
  hazardMaxSeverity: number
}

export interface ScoredCandidate extends ScoreInput {
  score: number
  breakdown: {
    etaScore: number
    turnComplexityScore: number
    hazardScore: number
  }
}

const WEIGHT_PROFILES: Record<
  ScoreVehicle,
  { eta: number; turns: number; hazard: number }
> = {
  car: { eta: 0.45, turns: 0.2, hazard: 0.35 },
  motorcycle: { eta: 0.55, turns: 0.1, hazard: 0.35 },
  bus: { eta: 0.3, turns: 0.3, hazard: 0.4 },
  walking: { eta: 0.6, turns: 0.1, hazard: 0.3 },
  cycling: { eta: 0.5, turns: 0.15, hazard: 0.35 },
}

/** Non-trivial maneuvers only — same rule route-intelligence used. */
export function countTurns(
  steps: Array<{ maneuver: { type: string } }>
): number {
  return steps.filter(
    (s) => !["depart", "arrive", "continue", "new name"].includes(s.maneuver.type)
  ).length
}

export function scoreCandidates(
  inputs: ScoreInput[],
  vehicle: ScoreVehicle
): ScoredCandidate[] {
  if (inputs.length === 0) return []

  const fastest = Math.min(...inputs.map((i) => i.durationSeconds))
  const slowest = Math.max(...inputs.map((i) => i.durationSeconds))
  const maxTurns = Math.max(1, ...inputs.map((i) => i.turnCount))
  const w = WEIGHT_PROFILES[vehicle] ?? WEIGHT_PROFILES.car

  return inputs
    .map((i): ScoredCandidate => {
      const etaScore =
        slowest === fastest
          ? 1
          : 1 - (i.durationSeconds - fastest) / (slowest - fastest)
      const turnComplexityScore = 1 - i.turnCount / maxTurns
      const hazardScore = Math.max(0, 1 - i.hazardSeverityTotal)

      const score =
        etaScore * w.eta +
        hazardScore * w.hazard +
        turnComplexityScore * w.turns

      return {
        ...i,
        score,
        breakdown: { etaScore, turnComplexityScore, hazardScore },
      }
    })
    .sort((a, b) => b.score - a.score)
}

export interface SaferRoutePick {
  saferId: string
  /** How much longer than the fastest route, in seconds (≥ 0). */
  extraSeconds: number
}

/**
 * Given every candidate and which one is fastest, decide whether
 * there's a materially safer route worth offering. Returns null
 * unless a candidate:
 *
 *   - isn't the fastest one,
 *   - has strictly fewer hazards OR ≥ 0.3 lower total severity,
 *   - doesn't introduce a worse single hazard,
 *   - and costs at most max(240 s, 30 % of the trip) extra.
 *
 * The fastest route having no hazards short-circuits to null —
 * there's nothing to route around.
 */
export function pickSaferRoute(
  candidates: ScoreInput[],
  fastestId: string,
  opts: { maxExtraSeconds?: number; maxExtraRatio?: number } = {}
): SaferRoutePick | null {
  const fastest = candidates.find((c) => c.id === fastestId)
  if (!fastest || fastest.hazardCount === 0) return null

  const budget = Math.max(
    opts.maxExtraSeconds ?? 240,
    (opts.maxExtraRatio ?? 0.3) * fastest.durationSeconds
  )

  const eligible = candidates.filter((c) => {
    if (c.id === fastestId) return false
    if (c.durationSeconds - fastest.durationSeconds > budget) return false
    if (c.hazardMaxSeverity > fastest.hazardMaxSeverity + 0.05) return false
    const fewer = c.hazardCount < fastest.hazardCount
    const muchLess = c.hazardSeverityTotal <= fastest.hazardSeverityTotal - 0.3
    return fewer || muchLess
  })

  if (eligible.length === 0) return null

  eligible.sort(
    (a, b) =>
      a.hazardSeverityTotal - b.hazardSeverityTotal ||
      a.hazardCount - b.hazardCount ||
      a.durationSeconds - b.durationSeconds
  )

  const safer = eligible[0]
  return {
    saferId: safer.id,
    extraSeconds: Math.max(
      0,
      Math.round(safer.durationSeconds - fastest.durationSeconds)
    ),
  }
}
