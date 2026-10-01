"use client"

// Daily money collected over the last 31 days on /admin/billing: two smooth
// lines (plans, listings), a legend, and a crosshair + tooltip on hover.
// Colours validated for colour-blind separation and contrast on the card's
// dark surface (dataviz validate_palette: #c2861c, #4590d6 on #26201d).

import { useMemo, useRef, useState } from "react"

export interface DayTotal {
  /** YYYY-MM-DD (Accra). */
  day: string
  plans: number
  listings: number
}

const SERIES = [
  { key: "plans" as const, label: "Plans", color: "#c2861c" },
  { key: "listings" as const, label: "Listings", color: "#4590d6" },
]

const W = 520
const H = 200
const PAD = { top: 16, right: 12, bottom: 26, left: 44 }

const ghs = (pesewas: number) => `GHS ${(pesewas / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
const dayLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })

/** Monotone-ish smooth path through points (Catmull-Rom → Bézier, clamped to the baseline). */
function smoothPath(pts: [number, number][], floor: number) {
  if (pts.length < 2) return ""
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1y = Math.min(floor, p1[1] + (p2[1] - p0[1]) / 6)
    const c2y = Math.min(floor, p2[1] - (p3[1] - p1[1]) / 6)
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

function niceMax(v: number) {
  if (v <= 0) return 10000 // GHS 100, so an empty month still has a scale
  const pow = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow
  return 10 * pow
}

export function BillingChart({ days }: { days: DayTotal[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { max, x, y } = useMemo(() => {
    const max = niceMax(Math.max(0, ...days.flatMap((d) => [d.plans, d.listings])))
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    return {
      max,
      x: (i: number) => PAD.left + (days.length <= 1 ? 0 : (i / (days.length - 1)) * innerW),
      y: (v: number) => PAD.top + innerH - (v / max) * innerH,
    }
  }, [days])

  const floor = H - PAD.bottom
  const ticks = [0, max / 2, max]
  const xTicks = [0, Math.floor((days.length - 1) / 2), days.length - 1].filter((i, n, a) => i >= 0 && a.indexOf(i) === n)
  const empty = days.every((d) => d.plans === 0 && d.listings === 0)

  function onMove(e: React.PointerEvent) {
    const svg = svgRef.current
    if (!svg || days.length === 0) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (days.length - 1))
    setHover(Math.max(0, Math.min(days.length - 1, i)))
  }

  const h = hover === null ? null : days[hover]

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-white/70" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`Money collected per day over the last ${days.length} days, plans and listings`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.08)" />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.55)">
                {t === 0 ? "0" : (t / 100).toLocaleString("en-GB", { notation: "compact" })}
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize="11" fill="rgba(255,255,255,0.55)">
              {dayLabel(days[i].day)}
            </text>
          ))}

          {SERIES.map((s) => (
            <path
              key={s.key}
              d={smoothPath(days.map((d, i) => [x(i), y(d[s.key])]), floor)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {hover !== null && h && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={floor} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
              {SERIES.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(h[s.key])} r={4.5} fill={s.color} stroke="#26201d" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>

        {hover !== null && h && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-[150px] -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs text-white shadow-lg backdrop-blur"
            style={{ left: `${Math.min(85, Math.max(15, (x(hover) / W) * 100))}%` }}
          >
            <p className="font-semibold">{dayLabel(h.day)}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="mt-1 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-white/75">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="tabular-nums">{ghs(h[s.key])}</span>
              </p>
            ))}
          </div>
        )}

        {empty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-white/55">
            No payments in this period yet
          </p>
        )}
      </div>
      <p className="mt-1 text-[11px] text-white/45">GHS per day</p>
    </div>
  )
}
