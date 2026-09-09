// lib/hazards.ts
//
// Shared vocabulary + client helpers for community hazard reports —
// user-submitted flags for flooding, police checkpoints, bad road
// surface, crashes and closures, shown on the map so other drivers
// see them.
//
// This file is client-safe (no server-only imports). The store and
// the identity hashing live in lib/hazard-store.ts /
// lib/hazard-identity.ts, both server-only.
//
// Honesty note, in the same spirit as lib/geo-intelligence: none of
// this is authoritative. A hazard here means "someone driving past
// said so", nothing more. Every surface that shows a hazard also
// shows when it was reported and lets people clear it, and reports
// expire on their own fairly quickly — a nav app that's confidently
// wrong about a flood is worse than one that says nothing.

export type HazardKind =
  | "flood"
  | "checkpoint"
  | "poor_surface"
  | "accident_prone"
  | "closure"

export type HazardSource =
  | "crowd_report"
  | "seed_dataset"
  | "official"
  // A known flood-prone area currently under a heavy-rain forecast
  // (see lib/hazard-feeds/forecast-flood.ts). Shown only while the
  // forecast is bad — no marker means no current risk.
  | "forecast"

export type HazardStatus = "active" | "cleared" | "expired"

export interface Hazard {
  id: string
  kind: HazardKind
  location: { lat: number; lng: number }
  note?: string
  source: HazardSource
  /** ISO timestamp. */
  createdAt: string
  /** ISO timestamp; absent for non-expiring seed/official zones. */
  expiresAt?: string
  confirmedCount: number
  clearedCount: number
  /** 0–1, starts at the kind default and drifts with confirm/clear votes. */
  severity: number
  status: HazardStatus
}

export interface BBox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export interface HazardKindMeta {
  kind: HazardKind
  /** Short label for chips/markers. */
  label: string
  /** One-liner shown in the report picker. */
  hint: string
  emoji: string
  /** Tailwind text/bg color hints, kept as plain hex for the marker DOM. */
  color: string
  /** How long a fresh report of this kind stays live, in ms. */
  ttlMs: number
  /** Starting severity (0–1) before any votes. */
  defaultSeverity: number
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const HAZARD_KINDS: Record<HazardKind, HazardKindMeta> = {
  flood: {
    kind: "flood",
    label: "Flooding",
    hint: "Water over the road or a flooded gutter",
    emoji: "🌊",
    color: "#3b82f6",
    ttlMs: 6 * HOUR,
    defaultSeverity: 0.7,
  },
  checkpoint: {
    kind: "checkpoint",
    label: "Police checkpoint",
    hint: "Police or military stop on the road",
    emoji: "🛑",
    color: "#6366f1",
    ttlMs: 3 * HOUR,
    defaultSeverity: 0.35,
  },
  poor_surface: {
    kind: "poor_surface",
    label: "Bad road",
    hint: "Potholes, washed-out or unpaved stretch",
    emoji: "🕳️",
    color: "#f59e0b",
    ttlMs: 30 * DAY,
    defaultSeverity: 0.45,
  },
  accident_prone: {
    kind: "accident_prone",
    label: "Crash",
    hint: "A crash or breakdown blocking the road",
    emoji: "💥",
    color: "#ef4444",
    ttlMs: 4 * HOUR,
    defaultSeverity: 0.6,
  },
  closure: {
    kind: "closure",
    label: "Road closed",
    hint: "Road fully blocked or closed off",
    emoji: "🚧",
    color: "#f97316",
    ttlMs: 24 * HOUR,
    defaultSeverity: 0.8,
  },
}

export const HAZARD_KIND_LIST: HazardKindMeta[] = Object.values(HAZARD_KINDS)

export function hazardKindMeta(kind: HazardKind): HazardKindMeta {
  return HAZARD_KINDS[kind] ?? HAZARD_KINDS.flood
}

export function isHazardKind(value: unknown): value is HazardKind {
  return (
    typeof value === "string" && Object.prototype.hasOwnProperty.call(HAZARD_KINDS, value)
  )
}

/**
 * "12 min ago" / "3 hr ago" / "just now" for a hazard's report time.
 */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ""
  const diffMs = Date.now() - then
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

/* =========================================================
   CLIENT FETCH HELPERS  — all talk to /api/hazards
========================================================= */

export interface HazardListResponse {
  hazards: Hazard[]
  /** false when no shared store is configured — the map just shows nothing. */
  configured: boolean
}

export async function fetchHazards(
  bbox: BBox,
  signal?: AbortSignal
): Promise<HazardListResponse> {
  const params = new URLSearchParams({
    bbox: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat]
      .map((n) => n.toFixed(5))
      .join(","),
  })

  const res = await fetch(`/api/hazards?${params.toString()}`, { signal })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || "Could not load hazards.")
  }

  const data = await res.json()
  return {
    hazards: Array.isArray(data.hazards) ? data.hazards : [],
    configured: data.configured !== false,
  }
}

export interface ReportHazardInput {
  kind: HazardKind
  lat: number
  lng: number
  note?: string
}

export type ReportHazardResult =
  | { ok: true; hazard: Hazard; duplicateOf?: Hazard }
  | { ok: false; error: string; status: number }

export async function reportHazard(
  input: ReportHazardInput
): Promise<ReportHazardResult> {
  const res = await fetch("/api/hazards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const data = await res.json().catch(() => null)

  if (res.ok && data?.hazard) {
    return { ok: true, hazard: data.hazard }
  }

  // 409 → a matching hazard already exists nearby; hand it back so
  // the UI can just select it instead of erroring.
  if (res.status === 409 && data?.hazard) {
    return { ok: true, hazard: data.hazard, duplicateOf: data.hazard }
  }

  return {
    ok: false,
    status: res.status,
    error: data?.error || "Could not send that report.",
  }
}

export async function voteHazard(
  id: string,
  vote: "confirm" | "clear"
): Promise<{ hazard: Hazard; counted: boolean }> {
  const res = await fetch(`/api/hazards/${encodeURIComponent(id)}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vote }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok || !data?.hazard) {
    throw new Error(data?.error || "Could not record that.")
  }

  return { hazard: data.hazard, counted: data.counted !== false }
}
