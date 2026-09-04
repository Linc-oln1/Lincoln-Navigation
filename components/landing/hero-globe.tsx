"use client"

import { seeded } from "@/components/landing/destination-scene"

interface HeroGlobeProps {
  size?: number
  className?: string
  /* Overlays a handful of glowing great-circle flight paths across
     the visible hemisphere, each with a traveling light pulse — the
     same "route being computed" language as the intro's map-trail
     act, so the globe reads as part of one system instead of a
     separate decoration. */
  trails?: boolean
}

/* Four waypoints on the visible disc (a 100x100 box centered on the
   sphere) connected in a ring, each leg bowed outward from center
   like a great-circle route rather than a straight line. */
const GLOBE_TRAIL_NODES: [number, number][] = [
  [28, 30],
  [72, 24],
  [66, 70],
  [24, 64],
]

const GLOBE_TRAIL_COLORS = ["#4dd8ff", "#0a84ff", "#ffcf8a", "#34c759"]

function globeTrailArc([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const cx = 50 + (mx - 50) * 1.55
  const cy = 50 + (my - 50) * 1.55
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

/* Sun-flare spikes: a handful of thin light rays at deterministic
   angles/lengths (an asymmetric mix, like a real lens flare — one
   long spike, several shorter cross-rays), not evenly spaced. */
const FLARE_SPIKES = [
  { angle: -18, length: 2.6 },
  { angle: 8, length: 1.1 },
  { angle: 45, length: 0.5 },
  { angle: 92, length: 0.7 },
  { angle: 135, length: 0.4 },
  { angle: 172, length: 0.9 },
  { angle: -70, length: 0.45 },
]

/* Simplified continent silhouettes (generalized coastlines, drawn
   from general geographic knowledge — not traced from any specific
   map dataset) in a 0-100 × 0-50 unit strip: North America, South
   America, Europe, Africa, Asia, Australia. Low-vertex-count on
   purpose — at globe scale a recognizable silhouette reads better
   than fussy coastline detail. */
const CONTINENTS = [
  "M10,8 L16,4 L22,5 L27,9 L30,8 L31,13 L28,15 L29,19 L25,22 L22,26 L19,23 L17,19 L12,18 L9,14 Z",
  "M24,25 L29,24 L32,28 L31,34 L33,38 L30,44 L27,48 L25,42 L22,36 L23,30 Z",
  "M45,10 L48,5 L52,4 L55,7 L54,11 L57,13 L53,15 L48,14 Z",
  "M47,16 L54,14 L59,17 L61,22 L60,28 L62,33 L58,40 L54,42 L52,36 L48,34 L46,28 L44,22 Z",
  "M58,10 L64,4 L74,3 L84,6 L92,10 L94,16 L90,20 L86,18 L80,22 L74,20 L70,25 L64,24 L60,18 Z",
  "M81,40 L85,37 L90,38 L92,41 L90,45 L85,46 L81,43 Z",
]

const CITY_LIGHT_COLORS = ["#ffd9a0", "#ffb347", "#ffcf8a", "#ff9d3d", "#ffdca8"]
const CITY_LIGHT_COUNT = 130

/**
 * A rotating "planet" built from an SVG world map (real, if
 * simplified, continent silhouettes) plus CSS lighting — no video,
 * no external texture/image. City-light clusters are SVG-clipped to
 * the actual landmass shapes rather than floating free, so the
 * rotating surface reads as an Earth, not an abstract pattern.
 * Styled after the classic "Earth from orbit at night" shot: a
 * near-black night hemisphere, a faint drifting cloud layer, a blue
 * atmospheric rim glow on the lit limb, and a small lens-flare sun
 * grazing the edge. Because it's DOM/SVG/CSS rather than a rendered
 * video frame, it's inherently crisp at any resolution.
 */
export function HeroGlobe({ size = 340, className = "", trails = false }: HeroGlobeProps) {
  const flareSize = size * 0.16

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="landing-globe-atmosphere" />

      <div
        className="landing-globe-sphere"
        style={{ width: size, height: size }}
      >
        <div className="landing-globe-nightside" />

        <svg
          className="landing-globe-citylights"
          viewBox="0 0 200 50"
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id="hg-continents" clipPathUnits="userSpaceOnUse">
              {CONTINENTS.map((d, i) => (
                <path key={`c-${i}`} d={d} />
              ))}
              {CONTINENTS.map((d, i) => (
                <path key={`c2-${i}`} d={d} transform="translate(100 0)" />
              ))}
            </clipPath>
          </defs>

          {/* faint landmass tint, visible mainly on the twilight
              terminator where city lights alone would look too sparse */}
          {CONTINENTS.map((d, i) => (
            <path key={`land-${i}`} d={d} fill="#0e2038" opacity={0.6} />
          ))}
          {CONTINENTS.map((d, i) => (
            <path key={`land2-${i}`} d={d} transform="translate(100 0)" fill="#0e2038" opacity={0.6} />
          ))}

          {/* city-light clusters, clipped to real continent shapes */}
          <g clipPath="url(#hg-continents)">
            {Array.from({ length: CITY_LIGHT_COUNT }).map((_, i) => {
              const cx = seeded(i * 7.13) * 200
              const cy = seeded(i * 3.71 + 11) * 50
              const r = 0.22 + seeded(i * 5.31 + 21) * 0.4
              const color = CITY_LIGHT_COLORS[i % CITY_LIGHT_COLORS.length]
              return <circle key={i} cx={cx} cy={cy} r={r} fill={color} />
            })}
          </g>
        </svg>

        {/* faint drifting cloud layer, different speed for parallax */}
        <svg
          className="landing-globe-clouds"
          viewBox="0 0 200 50"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 10 }).map((_, i) => {
            const cx = seeded(i * 9.7 + 40) * 200
            const cy = seeded(i * 6.3 + 60) * 50
            const rx = 6 + seeded(i * 4.9 + 80) * 10
            return <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={rx * 0.4} fill="#ffffff" />
          })}
        </svg>

        <div className="landing-globe-rim" />
        <div className="landing-globe-shade" />

        {trails && (
          <svg
            className="landing-globe-trails"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {GLOBE_TRAIL_NODES.map((from, i) => {
              const to = GLOBE_TRAIL_NODES[(i + 1) % GLOBE_TRAIL_NODES.length]
              const color = GLOBE_TRAIL_COLORS[i % GLOBE_TRAIL_COLORS.length]
              const d = globeTrailArc(from, to)
              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.35"
                    strokeLinecap="round"
                    opacity="0.5"
                    pathLength={1}
                    className="cine-draw"
                    style={{ animationDelay: `${400 + i * 220}ms` }}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    pathLength={1}
                    className="cine-route-pulse"
                    style={{ animationDelay: `${1200 + i * 340}ms`, animationDuration: "3.2s", color }}
                  />
                </g>
              )
            })}
            {GLOBE_TRAIL_NODES.map(([x, y], i) => (
              <circle
                key={`node-${i}`}
                cx={x}
                cy={y}
                r="0.9"
                fill={GLOBE_TRAIL_COLORS[i % GLOBE_TRAIL_COLORS.length]}
                className="cine-node-ping"
                style={{ animationDelay: `${900 + i * 220}ms`, color: GLOBE_TRAIL_COLORS[i % GLOBE_TRAIL_COLORS.length] }}
              />
            ))}
          </svg>
        )}
      </div>

      {/* Lens-flare sun, grazing the globe's upper-left limb */}
      <div
        className="landing-sunflare"
        style={{
          width: flareSize,
          height: flareSize,
          top: size * 0.1,
          left: size * 0.08,
        }}
      >
        {FLARE_SPIKES.map((spike, i) => (
          <div
            key={i}
            className="landing-sunflare-spike"
            style={{
              width: flareSize * spike.length,
              transform: `rotate(${spike.angle}deg)`,
            }}
          />
        ))}
        <div className="landing-sunflare-core" />
      </div>
    </div>
  )
}
