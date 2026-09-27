// lib/rate-limit.ts  (server only)
//
// A small fixed-window counter that is shared across every server instance
// when Upstash Redis is configured (the same store the hazard reports use),
// and falls back to per-process memory otherwise (local dev). On serverless
// hosting a plain in-memory Map is a different Map on each instance, so it
// can't enforce a real limit on its own.

import { Redis } from "@upstash/redis"

let redis: Redis | null | undefined

function getRedis(): Redis | null {
  if (redis !== undefined) return redis
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim()
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim()
  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

const memory = new Map<string, { count: number; resetAt: number }>()

function memoryBump(key: string, windowSec: number, by: number) {
  const now = Date.now()
  const entry = memory.get(key)
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: by, resetAt: now + windowSec * 1000 })
  } else {
    entry.count += by
  }
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k)
  }
  return memory.get(key)!.count
}

/**
 * Adds `by` to the counter for `key` (window starts at the first hit) and
 * returns the new count. Never throws: if Redis is unreachable it counts in
 * memory instead, so a Redis outage can't take an endpoint down.
 */
export async function bump(key: string, windowSec: number, by = 1): Promise<number> {
  const r = getRedis()
  if (r) {
    try {
      const count = await r.incrby(key, by)
      if (count === by) await r.expire(key, windowSec)
      return count
    } catch {
      // fall through to memory
    }
  }
  return memoryBump(key, windowSec, by)
}

/** Current count without adding to it. */
export async function peek(key: string): Promise<number> {
  const r = getRedis()
  if (r) {
    try {
      return Number((await r.get<number>(key)) ?? 0)
    } catch {
      // fall through to memory
    }
  }
  const entry = memory.get(key)
  return entry && entry.resetAt > Date.now() ? entry.count : 0
}

/** True once `key` has been bumped more than `limit` times in the window. */
export async function overLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  return (await bump(key, windowSec)) > limit
}
