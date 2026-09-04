"use client"

export type SceneVariant =
  | "kakum"
  | "capecoast"
  | "monument"
  | "volta"
  | "mole"

interface DestinationSceneProps {
  variant: SceneVariant
  className?: string
}

/* =========================================================
   Deterministic "random" helper

   Backgrounds below scatter small repeated shapes (mist wisps,
   birds, grass tufts). Using Math.random() during render would
   make the server-rendered HTML disagree with the client's first
   render and trip a hydration mismatch, so positions are derived
   from a pure, seeded function instead — identical output every
   time, on server and client alike.
========================================================= */

export function seeded(seed: number): number {
  const x = Math.sin(seed) * 10000
  const value = x - Math.floor(x)
  // Rounded to a fixed precision so server- and client-rendered output
  // stay byte-identical — Math.sin() can differ by a few ULPs between
  // Node's V8 and the browser's, which otherwise trips a hydration
  // mismatch on every element that uses this value.
  return Math.round(value * 1e6) / 1e6
}

/* =========================================================
   Each destination is a small hand-drawn SVG scene — gradients
   and silhouettes, not photography — so the hero stays crisp,
   dependency-free, and never 404s on a hot-linked image.
========================================================= */

function KakumScene() {
  const canopyRows = [
    { y: 430, count: 14, r: 46, color: "#0d2b1c" },
    { y: 460, count: 16, r: 52, color: "#123a24" },
    { y: 495, count: 18, r: 58, color: "#184a2d" },
  ]

  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="kakum-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e3d33" />
          <stop offset="55%" stopColor="#1c6e52" />
          <stop offset="100%" stopColor="#2f8f5f" />
        </linearGradient>
      </defs>

      <rect width="800" height="600" fill="url(#kakum-sky)" />

      {/* mist */}
      {[120, 220, 320].map((y, i) => (
        <ellipse
          key={y}
          cx={200 + seeded(i + 1) * 500}
          cy={y}
          rx={260}
          ry={26}
          fill="#eafff2"
          opacity={0.08 + i * 0.03}
        />
      ))}

      {/* canopy silhouette rows, back to front */}
      {canopyRows.map((row, rowIndex) => (
        <g key={row.y}>
          {Array.from({ length: row.count }).map((_, i) => {
            const cx =
              (i / row.count) * 900 - 60 + seeded(rowIndex * 30 + i) * 30
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={row.y + seeded(i * 3 + rowIndex) * 14}
                rx={row.r}
                ry={row.r * 0.7}
                fill={row.color}
              />
            )
          })}
        </g>
      ))}

      {/* canopy walkway towers + rope bridge */}
      <rect x="150" y="330" width="16" height="180" fill="#1a1410" />
      <rect x="620" y="310" width="16" height="200" fill="#1a1410" />
      <path
        d="M 158 350 Q 400 410 628 335"
        stroke="#3a2c1f"
        strokeWidth="6"
        fill="none"
      />
      <path
        d="M 158 366 Q 400 428 628 351"
        stroke="#3a2c1f"
        strokeWidth="6"
        fill="none"
      />
      {Array.from({ length: 10 }).map((_, i) => {
        const t = i / 9
        const x = 158 + t * (628 - 158)
        const y1 = 350 + Math.sin(t * Math.PI) * 60
        const y2 = 366 + Math.sin(t * Math.PI) * 60
        return (
          <line
            key={i}
            x1={x}
            y1={y1}
            x2={x}
            y2={y2}
            stroke="#3a2c1f"
            strokeWidth="3"
          />
        )
      })}

      {/* foreground canopy frame */}
      <ellipse cx="60" cy="560" rx="220" ry="140" fill="#08201580" />
      <ellipse cx="760" cy="580" rx="240" ry="150" fill="#08201580" />
    </svg>
  )
}

function CapeCoastScene() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2350" />
          <stop offset="45%" stopColor="#a34b56" />
          <stop offset="75%" stopColor="#e8934f" />
          <stop offset="100%" stopColor="#f6c86a" />
        </linearGradient>
        <linearGradient id="cc-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2b26b" />
          <stop offset="30%" stopColor="#6b6f9a" />
          <stop offset="100%" stopColor="#1b2340" />
        </linearGradient>
      </defs>

      <rect width="800" height="380" fill="url(#cc-sky)" />
      <circle cx="560" cy="330" r="46" fill="#ffe9b8" opacity="0.9" />
      <rect y="380" width="800" height="220" fill="url(#cc-sea)" />

      {/* sun reflection */}
      <rect x="520" y="380" width="80" height="220" fill="#ffdca0" opacity="0.25" />

      {/* rocky outcrop */}
      <path d="M 0 460 L 130 420 L 230 470 L 330 430 L 420 480 L 420 600 L 0 600 Z" fill="#0f1522" />

      {/* castle silhouette */}
      <g fill="#e9e2d3">
        <rect x="150" y="330" width="230" height="110" />
        <rect x="150" y="300" width="30" height="30" />
        <rect x="200" y="290" width="30" height="40" />
        <rect x="250" y="280" width="34" height="50" />
        <rect x="300" y="290" width="30" height="40" />
        <rect x="350" y="300" width="30" height="30" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={150 + i * 30} y="322" width="14" height="10" />
        ))}
      </g>
      <rect x="262" y="255" width="4" height="28" fill="#e9e2d3" />
      <path d="M 266 258 L 292 265 L 266 272 Z" fill="#d4453f" />

      {/* palms */}
      {[[80, 470], [700, 450]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-4" y="0" width="8" height="90" fill="#140e10" />
          {[0, 1, 2, 3, 4].map((leaf) => (
            <ellipse
              key={leaf}
              cx={Math.cos((leaf / 5) * Math.PI * 2) * 34}
              cy={-Math.abs(Math.sin((leaf / 5) * Math.PI * 2) * 20) - 6}
              rx="34"
              ry="10"
              fill="#140e10"
              transform={`rotate(${leaf * 72})`}
            />
          ))}
        </g>
      ))}
    </svg>
  )
}

function MonumentScene() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="mon-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b0f2e" />
          <stop offset="55%" stopColor="#372a63" />
          <stop offset="100%" stopColor="#7d5a8c" />
        </linearGradient>
      </defs>

      <rect width="800" height="600" fill="url(#mon-sky)" />

      {/* stars */}
      {Array.from({ length: 26 }).map((_, i) => (
        <circle
          key={i}
          cx={seeded(i) * 800}
          cy={seeded(i + 50) * 220}
          r={seeded(i + 100) * 1.4 + 0.4}
          fill="#ffffff"
          opacity={0.5 + seeded(i + 200) * 0.5}
        />
      ))}

      {/* distant city skyline glow */}
      <rect y="360" width="800" height="40" fill="#e7a94f" opacity="0.18" />
      {Array.from({ length: 14 }).map((_, i) => {
        const w = 20 + seeded(i * 7) * 30
        const h = 30 + seeded(i * 11) * 90
        const x = i * 58 + seeded(i) * 20
        return (
          <rect
            key={i}
            x={x}
            y={400 - h}
            width={w}
            height={h}
            fill="#1a1530"
          />
        )
      })}

      {/* reflecting pool */}
      <rect y="470" width="800" height="130" fill="#161233" />
      <rect y="470" width="800" height="12" fill="#3a2f66" opacity="0.6" />

      {/* hedge border */}
      <rect y="452" width="800" height="20" fill="#0e2016" />

      {/* memorial tower */}
      <g transform="translate(400 0)">
        <polygon points="-70,470 70,470 30,220 -30,220" fill="#e9e4d8" />
        <polygon points="-30,220 30,220 0,150" fill="#e9e4d8" />
        <polygon points="-8,150 8,150 0,120" fill="#d4453f" />
        <rect x="-70" y="460" width="140" height="14" fill="#d8d2c2" />
        {/* reflection */}
        <g transform="translate(0 940) scale(1 -1)" opacity="0.28">
          <polygon points="-70,470 70,470 30,220 -30,220" fill="#e9e4d8" />
          <polygon points="-30,220 30,220 0,150" fill="#e9e4d8" />
        </g>
      </g>
    </svg>
  )
}

function VoltaScene() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="volta-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6fa8c9" />
          <stop offset="55%" stopColor="#cfe0c7" />
          <stop offset="100%" stopColor="#f3dfa8" />
        </linearGradient>
        <linearGradient id="volta-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3dfa8" />
          <stop offset="25%" stopColor="#7fa9b3" />
          <stop offset="100%" stopColor="#2f5866" />
        </linearGradient>
      </defs>

      <rect width="800" height="360" fill="url(#volta-sky)" />
      <circle cx="620" cy="300" r="50" fill="#fff3d0" opacity="0.85" />

      {/* birds */}
      {[[150, 90], [190, 110], [230, 85], [500, 130]].map(([x, y], i) => (
        <path
          key={i}
          d={`M ${x} ${y} q 8 -10 16 0 q 8 -10 16 0`}
          stroke="#33302a"
          strokeWidth="2.5"
          fill="none"
          opacity="0.7"
        />
      ))}

      {/* far shoreline */}
      <path
        d="M 0 350 Q 200 320 400 345 T 800 335 L 800 380 L 0 380 Z"
        fill="#3c5a45"
        opacity="0.55"
      />

      <rect y="360" width="800" height="240" fill="url(#volta-water)" />

      {/* reflection streaks */}
      {[400, 440, 480, 520].map((y, i) => (
        <rect
          key={y}
          x={560 - i * 14}
          y={y}
          width={120 + i * 20}
          height="6"
          fill="#fff3d0"
          opacity={0.25 - i * 0.04}
        />
      ))}

      {/* boat */}
      <g transform="translate(300 460)">
        <path d="M -50 0 Q 0 22 50 0 L 40 12 L -40 12 Z" fill="#1b140f" />
        <line x1="0" y1="-40" x2="0" y2="0" stroke="#1b140f" strokeWidth="3" />
        <path d="M 2 -40 L 2 -6 L 34 -14 Z" fill="#2c2118" />
        <circle cx="-6" cy="-46" r="6" fill="#1b140f" />
        <line x1="-6" y1="-40" x2="-6" y2="-10" stroke="#1b140f" strokeWidth="3" />
      </g>
    </svg>
  )
}

function MoleScene() {
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="mole-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3560" />
          <stop offset="45%" stopColor="#b46b4c" />
          <stop offset="75%" stopColor="#e8a559" />
          <stop offset="100%" stopColor="#f6cf87" />
        </linearGradient>
      </defs>

      <rect width="800" height="380" fill="url(#mole-sky)" />
      <circle cx="400" cy="360" r="90" fill="#ffdf9e" opacity="0.9" />

      {/* rolling savanna */}
      <path d="M 0 400 Q 200 370 400 395 T 800 385 L 800 600 L 0 600 Z" fill="#5c4326" />
      <path d="M 0 430 Q 250 400 500 425 T 800 415 L 800 600 L 0 600 Z" fill="#3d2c1a" />

      {/* acacia trees */}
      {[[120, 380, 1], [660, 360, 0.85], [720, 400, 0.6]].map(
        ([x, y, scale], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${scale})`}>
            <rect x="-4" y="0" width="8" height="60" fill="#1c130c" />
            <ellipse cx="0" cy="-10" rx="70" ry="16" fill="#1c130c" />
            <ellipse cx="-30" cy="0" rx="34" ry="10" fill="#1c130c" />
            <ellipse cx="34" cy="4" rx="30" ry="9" fill="#1c130c" />
          </g>
        )
      )}

      {/* elephants */}
      {[
        { x: 300, y: 470, scale: 1 },
        { x: 400, y: 490, scale: 0.7 },
      ].map((e, i) => (
        <g key={i} transform={`translate(${e.x} ${e.y}) scale(${e.scale})`} fill="#241a12">
          <ellipse cx="0" cy="0" rx="60" ry="34" />
          <circle cx="-55" cy="-10" r="26" />
          <path d="M -78 -6 q -14 10 -8 34 q 8 6 12 -4 q 4 -14 6 -26 Z" />
          <ellipse cx="-66" cy="-18" rx="14" ry="18" opacity="0.85" />
          {[-30, -8, 16, 38].map((lx) => (
            <rect key={lx} x={lx} y="24" width="10" height="30" rx="3" />
          ))}
        </g>
      ))}

      {/* foreground grass tufts */}
      {Array.from({ length: 18 }).map((_, i) => {
        const x = i * 46 + seeded(i) * 20
        return (
          <path
            key={i}
            d={`M ${x} 600 q 6 -30 -4 -46 M ${x} 600 q -6 -26 4 -40 M ${x} 600 q 14 -20 10 -38`}
            stroke="#1c130c"
            strokeWidth="3"
            fill="none"
          />
        )
      })}
    </svg>
  )
}

const SCENES: Record<SceneVariant, () => React.JSX.Element> = {
  kakum: KakumScene,
  capecoast: CapeCoastScene,
  monument: MonumentScene,
  volta: VoltaScene,
  mole: MoleScene,
}

export function DestinationScene({ variant, className = "" }: DestinationSceneProps) {
  const Scene = SCENES[variant]

  return (
    <div className={`landing-scene ${className}`} aria-hidden="true">
      <Scene />
      <div className="landing-scene-vignette" />
    </div>
  )
}
