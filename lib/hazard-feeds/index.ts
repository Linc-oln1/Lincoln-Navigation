// lib/hazard-feeds/index.ts  (server only)
//
// Aggregates every configured HazardFeed for /api/hazards. A feed
// that throws is logged and dropped — one bad upstream never takes
// the whole hazard layer down.

import type { Hazard } from "@/lib/hazards"
import type { HazardFeed } from "./types"
import { forecastFloodFeed } from "./forecast-flood"
import { gdacsFeed } from "./gdacs"

const FEEDS: HazardFeed[] = [forecastFloodFeed, gdacsFeed]

export async function getFeedHazards(): Promise<Hazard[]> {
  const active = FEEDS.filter((f) => f.isConfigured?.() ?? true)

  const settled = await Promise.allSettled(active.map((f) => f.fetch()))

  return settled.flatMap((result, i) => {
    if (result.status === "fulfilled") return result.value
    console.error(`[hazard-feeds] ${active[i].id} failed:`, result.reason)
    return []
  })
}

export type { HazardFeed } from "./types"
