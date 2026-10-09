// lib/x-poster.ts  (server only)
//
// Posts one tweet to the Lincoln Navigation X account with the account's own
// app keys (OAuth 1.0a user context, X API v2 POST /2/tweets). Uses only Node's
// crypto, no extra package. Keys live in Vercel env vars, never in the repo.

import { createHmac, randomBytes } from "node:crypto"

const ENDPOINT = "https://api.x.com/2/tweets"

export function xKeys() {
  const k = {
    consumerKey: process.env.X_API_KEY?.trim() || "",
    consumerSecret: process.env.X_API_SECRET?.trim() || "",
    token: process.env.X_ACCESS_TOKEN?.trim() || "",
    tokenSecret: process.env.X_ACCESS_SECRET?.trim() || "",
  }
  return k.consumerKey && k.consumerSecret && k.token && k.tokenSecret ? k : null
}

const enc = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

function authHeader(method: string, url: string, k: NonNullable<ReturnType<typeof xKeys>>) {
  const oauth: Record<string, string> = {
    oauth_consumer_key: k.consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: k.token,
    oauth_version: "1.0",
  }
  // A JSON body is not part of the signature; only the oauth_* parameters are.
  const paramString = Object.keys(oauth)
    .sort()
    .map((key) => `${enc(key)}=${enc(oauth[key])}`)
    .join("&")
  const base = [method.toUpperCase(), enc(url), enc(paramString)].join("&")
  const signingKey = `${enc(k.consumerSecret)}&${enc(k.tokenSecret)}`
  oauth.oauth_signature = createHmac("sha1", signingKey).update(base).digest("base64")
  return (
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((key) => `${enc(key)}="${enc(oauth[key])}"`)
      .join(", ")
  )
}

export type PostResult = { ok: true; id: string } | { ok: false; status: number; error: string }

export async function postTweet(text: string): Promise<PostResult> {
  const k = xKeys()
  if (!k) return { ok: false, status: 0, error: "X keys are not set." }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: authHeader("POST", ENDPOINT, k), "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await res.json().catch(() => ({}))) as { data?: { id?: string }; detail?: string; title?: string }
    if (res.ok && body.data?.id) return { ok: true, id: body.data.id }
    return { ok: false, status: res.status, error: body.detail || body.title || `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "request failed" }
  }
}
