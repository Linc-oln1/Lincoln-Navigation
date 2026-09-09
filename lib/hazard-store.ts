// lib/hazard-store.ts  (server only)
//
// The shared datastore for community hazard reports. Two backends
// behind one interface, chosen by environment — same "works
// without a key, better with one" shape as the rest of this app,
// except here the fallback is dev-only: crowd data that resets on
// every serverless cold start would be misleading, so in production
// the feature stays off until a real store is configured.
//
//   1. Upstash Redis  — when UPSTASH_REDIS_REST_URL / _TOKEN (or the
//      KV_REST_API_* vars the Vercel integration sets) are present.
//      Add it in ~5 min from the Vercel Marketplace; no code change.
//
//   2. In-memory Map  — dev only (NODE_ENV !== "production"). Lets
//      you build and click through the whole flow locally with no
//      account. State lives for the lifetime of the process.
//
// The interface is deliberately storage-agnostic so this can move
// to a Supabase table later (see docs/USER_ACCOUNTS.md) without
// touching the API routes or the UI.

import { Redis } from "@upstash/redis"
import {
  hazardKindMeta,
  type BBox,
  type Hazard,
  type HazardKind,
} from "./hazards"

export interface CreateHazardInput {
  kind: HazardKind
  lat: number
  lng: number
  note?: string
  reporterHash: string
}

export interface VoteResult {
  hazard: Hazard
  /** false when this reporter had already voted on this hazard. */
  counted: boolean
}

export interface HazardStore {
  listActive(bbox: BBox): Promise<Hazard[]>
  get(id: string): Promise<Hazard | null>
  create(input: CreateHazardInput): Promise<Hazard>
  vote(
    id: string,
    vote: "confirm" | "clear",
    voterHash: string
  ): Promise<VoteResult | null>
  /** Reports created by this reporter within the last `windowMs`. */
  countRecentByReporter(reporterHash: string, windowMs: number): Promise<number>
}

/* =========================================================
   SHARED HELPERS
========================================================= */

const MAX_NOTE_LENGTH = 200
const CLEAR_MARGIN = 3 // (clears − confirms) that flips a hazard to "cleared"

export function sanitizeNote(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined
  const cleaned = raw
    .replace(/<[^>]*>/g, "") // strip any HTML
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NOTE_LENGTH)
  return cleaned.length > 0 ? cleaned : undefined
}

function withinBBox(h: Hazard, b: BBox): boolean {
  return (
    h.location.lng >= b.minLng &&
    h.location.lng <= b.maxLng &&
    h.location.lat >= b.minLat &&
    h.location.lat <= b.maxLat
  )
}

function isExpired(h: Hazard): boolean {
  return Boolean(h.expiresAt && new Date(h.expiresAt).getTime() <= Date.now())
}

function newHazard(input: CreateHazardInput): Hazard {
  const meta = hazardKindMeta(input.kind)
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    kind: input.kind,
    location: { lat: input.lat, lng: input.lng },
    note: sanitizeNote(input.note),
    source: "crowd_report",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + meta.ttlMs).toISOString(),
    confirmedCount: 0,
    clearedCount: 0,
    severity: meta.defaultSeverity,
    status: "active",
  }
}

/** Applies a vote to a hazard object in place-ish (returns a new one). */
function applyVote(hazard: Hazard, vote: "confirm" | "clear"): Hazard {
  const next: Hazard = { ...hazard }
  if (vote === "confirm") {
    next.confirmedCount += 1
    next.severity = Math.min(1, next.severity + 0.05)
  } else {
    next.clearedCount += 1
    next.severity = Math.max(0, next.severity - 0.15)
  }
  if (next.clearedCount - next.confirmedCount >= CLEAR_MARGIN) {
    next.status = "cleared"
  }
  return next
}

function ttlSeconds(h: Hazard): number {
  if (!h.expiresAt) return 0
  return Math.max(1, Math.round((new Date(h.expiresAt).getTime() - Date.now()) / 1000))
}

/* =========================================================
   IN-MEMORY STORE  (dev only)
========================================================= */

class MemoryHazardStore implements HazardStore {
  private hazards = new Map<string, Hazard>()
  private votes = new Map<string, Set<string>>()
  private reporterLog = new Map<string, number[]>() // hash → createdAt ms list

  async listActive(bbox: BBox): Promise<Hazard[]> {
    const out: Hazard[] = []
    for (const [id, h] of this.hazards) {
      if (isExpired(h)) {
        this.hazards.delete(id)
        this.votes.delete(id)
        continue
      }
      if (h.status === "active" && withinBBox(h, bbox)) out.push(h)
    }
    return out
  }

  async get(id: string): Promise<Hazard | null> {
    const h = this.hazards.get(id)
    if (!h) return null
    if (isExpired(h)) {
      this.hazards.delete(id)
      return null
    }
    return h
  }

  async create(input: CreateHazardInput): Promise<Hazard> {
    const hazard = newHazard(input)
    this.hazards.set(hazard.id, hazard)
    const log = this.reporterLog.get(input.reporterHash) ?? []
    log.push(Date.now())
    this.reporterLog.set(input.reporterHash, log)
    return hazard
  }

  async vote(
    id: string,
    vote: "confirm" | "clear",
    voterHash: string
  ): Promise<VoteResult | null> {
    const current = await this.get(id)
    if (!current) return null

    const voters = this.votes.get(id) ?? new Set<string>()
    if (voters.has(voterHash)) {
      return { hazard: current, counted: false }
    }
    voters.add(voterHash)
    this.votes.set(id, voters)

    const updated = applyVote(current, vote)
    this.hazards.set(id, updated)
    return { hazard: updated, counted: true }
  }

  async countRecentByReporter(
    reporterHash: string,
    windowMs: number
  ): Promise<number> {
    const cutoff = Date.now() - windowMs
    const log = (this.reporterLog.get(reporterHash) ?? []).filter((t) => t >= cutoff)
    this.reporterLog.set(reporterHash, log)
    return log.length
  }
}

/* =========================================================
   UPSTASH REDIS STORE
========================================================= */

const KEY = {
  hazard: (id: string) => `hz:h:${id}`,
  activeSet: "hz:active",
  votes: (id: string) => `hz:v:${id}`,
  rate: (hash: string) => `hz:rl:${hash}`,
}

class RedisHazardStore implements HazardStore {
  constructor(private redis: Redis) {}

  async listActive(bbox: BBox): Promise<Hazard[]> {
    const ids = await this.redis.smembers(KEY.activeSet)
    if (ids.length === 0) return []

    const raw = await this.redis.mget<(Hazard | null)[]>(
      ...ids.map((id) => KEY.hazard(id))
    )

    const alive: Hazard[] = []
    const dead: string[] = []

    raw.forEach((h, i) => {
      const id = ids[i]!
      if (!h || isExpired(h) || h.status !== "active") {
        dead.push(id)
        return
      }
      if (withinBBox(h, bbox)) alive.push(h)
    })

    if (dead.length > 0) {
      // Opportunistic sweep — the hazard keys have already expired
      // on their own; this just keeps the index tidy.
      await this.redis.srem(KEY.activeSet, ...dead)
    }

    return alive
  }

  async get(id: string): Promise<Hazard | null> {
    const h = await this.redis.get<Hazard>(KEY.hazard(id))
    if (!h || isExpired(h)) return null
    return h
  }

  async create(input: CreateHazardInput): Promise<Hazard> {
    const hazard = newHazard(input)
    const ttl = ttlSeconds(hazard)

    await Promise.all([
      this.redis.set(KEY.hazard(hazard.id), hazard, { ex: ttl }),
      this.redis.sadd(KEY.activeSet, hazard.id),
    ])

    // Fixed-window rate counter: first report starts a 1-hour clock.
    const count = await this.redis.incr(KEY.rate(input.reporterHash))
    if (count === 1) {
      await this.redis.expire(KEY.rate(input.reporterHash), 60 * 60)
    }

    return hazard
  }

  async vote(
    id: string,
    vote: "confirm" | "clear",
    voterHash: string
  ): Promise<VoteResult | null> {
    const current = await this.get(id)
    if (!current) return null

    const added = await this.redis.sadd(KEY.votes(id), voterHash)
    if (added === 0) {
      return { hazard: current, counted: false }
    }
    await this.redis.expire(KEY.votes(id), Math.max(ttlSeconds(current), 3600))

    const updated = applyVote(current, vote)

    if (updated.status === "cleared") {
      // Keep it readable for an hour so the voter sees the outcome,
      // but drop it from the active index immediately.
      await Promise.all([
        this.redis.set(KEY.hazard(id), updated, { ex: 3600 }),
        this.redis.srem(KEY.activeSet, id),
      ])
    } else {
      await this.redis.set(KEY.hazard(id), updated, { keepTtl: true })
    }

    return { hazard: updated, counted: true }
  }

  async countRecentByReporter(reporterHash: string): Promise<number> {
    const count = await this.redis.get<number>(KEY.rate(reporterHash))
    return typeof count === "number" ? count : Number(count ?? 0)
  }
}

/* =========================================================
   SELECTION
========================================================= */

function redisCredentials(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || ""
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ""
  if (url.trim() && token.trim()) return { url: url.trim(), token: token.trim() }
  return null
}

let cachedStore: HazardStore | null | undefined

export function getHazardStore(): HazardStore | null {
  if (cachedStore !== undefined) return cachedStore

  const creds = redisCredentials()
  if (creds) {
    cachedStore = new RedisHazardStore(new Redis(creds))
  } else if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[hazards] No Upstash Redis configured — using an in-memory store (dev only, resets on restart)."
    )
    cachedStore = new MemoryHazardStore()
  } else {
    cachedStore = null
  }

  return cachedStore
}

export function isHazardStoreConfigured(): boolean {
  return getHazardStore() !== null
}

/** Test seam — drops the cached store so env changes take effect. */
export function __resetHazardStoreForTests(): void {
  cachedStore = undefined
}
