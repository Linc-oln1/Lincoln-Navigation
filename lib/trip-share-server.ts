// lib/trip-share-server.ts  (server only)
//
// Shared pieces of the live-location-sharing routes (app/api/share/*).

import { NextResponse } from "next/server"
import { hashToken } from "@/lib/fleet-server"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import { clientIp } from "@/lib/hazard-identity"
import { bump, peek } from "@/lib/rate-limit"

/** Longest a share may run, in minutes. */
export const MAX_DURATION_MIN = 12 * 60
export const DURATIONS_MIN = [60, 240, 720] as const

/** A real, finite number — not null, "", false or a numeric string. */
export function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** Cleaned free text: trimmed, control characters removed, capped. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const t = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max)
  return t || null
}

export function tokenOk(token: unknown): token is string {
  return typeof token === "string" && token.length >= 20 && token.length <= 100
}

// Guessing links: only wrong tokens count, per address, in the shared store.
const MISS_LIMIT = 30
const MISS_WINDOW_S = 10 * 60

export async function blocked(req: Request): Promise<NextResponse | null> {
  if ((await peek(`share:miss:${clientIp(req)}`)) >= MISS_LIMIT) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }
  return null
}

export async function notFound(req: Request, message = "This link is no longer valid.") {
  await bump(`share:miss:${clientIp(req)}`, MISS_WINDOW_S)
  return NextResponse.json({ error: message }, { status: 404 })
}

export function unavailable() {
  return NextResponse.json({ error: "Sharing isn't available right now." }, { status: 501 })
}

export { ADMIN_ENABLED, createAdminClient, hashToken }
