// app/api/cron/x-post/route.ts
//
// Posts the next item from lib/x-posts.ts to the Lincoln Navigation X account,
// at most once a day (vercel.json). Safe by default:
//   - does nothing unless X_AUTOPOST=1 (unset it to switch posting off)
//   - needs CRON_SECRET (Vercel sends it as a Bearer token); without one the
//     route refuses, since it would otherwise be callable by anyone
//   - needs Upstash Redis, which remembers the next post and the day's lock, so
//     nothing is posted twice
//   - ?dry=1 shows what would go out next without posting or moving the pointer

import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { X_POSTS } from "@/lib/x-posts"
import { postTweet, xKeys } from "@/lib/x-poster"

export const dynamic = "force-dynamic"

const NEXT_KEY = "xpost:next"

function getRedis() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim()
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim()
  return url && token ? new Redis({ url, token }) : null
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 })
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dry = new URL(req.url).searchParams.get("dry") === "1"
  if (!dry && process.env.X_AUTOPOST !== "1") return NextResponse.json({ skipped: "X_AUTOPOST is not 1." })
  if (!xKeys()) return NextResponse.json({ error: "X keys are not set." }, { status: 503 })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ error: "Upstash Redis is not configured." }, { status: 503 })

  const next = Number((await redis.get<number>(NEXT_KEY)) ?? 0)
  if (next >= X_POSTS.length) return NextResponse.json({ done: true, posted: next })
  const text = X_POSTS[next]
  if (dry) return NextResponse.json({ dry: true, index: next, of: X_POSTS.length, text })

  // One post per UTC day, even if the cron fires twice.
  const dayKey = `xpost:day:${new Date().toISOString().slice(0, 10)}`
  const claimed = await redis.set(dayKey, "1", { nx: true, ex: 172_800 })
  if (!claimed) return NextResponse.json({ skipped: "Already posted today." })

  const result = await postTweet(text)
  if (!result.ok) {
    await redis.del(dayKey)
    console.error("[x-post] failed", result.status, result.error)
    return NextResponse.json({ error: result.error, status: result.status }, { status: 502 })
  }
  await redis.set(NEXT_KEY, next + 1)
  return NextResponse.json({ posted: next + 1, of: X_POSTS.length, id: result.id })
}
