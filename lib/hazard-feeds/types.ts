// lib/hazard-feeds/types.ts  (server only)
//
// A HazardFeed turns some external or derived source into the same
// Hazard shape the community reports use, so /api/hazards can merge
// them all. Two exist today — forecast-flood (Open-Meteo rain over
// the known flood corridors) and gdacs (UN/EC official alerts) — and
// a real NADMO / GMet feed would slot in the same way.

import type { Hazard } from "@/lib/hazards"

export interface HazardFeed {
  /** Stable id, used in logs. */
  id: string
  /** Human label for attribution. */
  label: string
  /**
   * Whether this feed can run right now (keys present, flag on…).
   * Defaults to true when omitted.
   */
  isConfigured?(): boolean
  /**
   * The feed's currently-active hazards. Should be cheap to call
   * repeatedly — each feed does its own upstream fetch + caching and
   * scopes itself geographically (this app is Ghana-only).
   */
  fetch(): Promise<Hazard[]>
}
