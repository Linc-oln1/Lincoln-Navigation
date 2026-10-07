import Link from "next/link"
import { ROUTE_GUIDES } from "@/lib/route-guides"

/** Guides people search for most, linked from the homepage so they are easy to find and crawl. */
const POPULAR_ROUTE_IDS = [
  "accra-to-kumasi",
  "accra-to-cape-coast",
  "accra-to-takoradi",
  "kumasi-to-tamale",
  "accra-to-akosombo",
  "accra-to-ho",
  "accra-to-hohoe",
  "tamale-to-mole-national-park",
]

const INK = "#3e2d1a"
const MUTED = "#7a6444"
const GOLD = "#b8924a"

/** Paper grain: a faint noise tile laid over the parchment. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .1 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")"

const PARCHMENT_BODY = `${GRAIN}, linear-gradient(180deg, #f3e9d2 0%, #efe2c6 50%, #f1e5cb 100%)`
const PARCHMENT_ROLL = `${GRAIN}, linear-gradient(180deg, #cdb683 0%, #f2e7cd 38%, #e6d4a8 70%, #c4ab76 100%)`
const BARK = [
  "linear-gradient(90deg, rgba(40,25,10,.45), rgba(40,25,10,0) 38%, rgba(255,245,220,.22) 60%, rgba(40,25,10,.5))",
  "repeating-linear-gradient(118deg, #8a6f4a 0 7px, #b39a6f 7px 13px, #9a7f57 13px 18px)",
].join(", ")

/** Golden leaves, placed once from a fixed seed so the tree never changes between renders. */
const LEAVES = (() => {
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const colours = ["#c9a050", "#b88a3a", "#dcc27a", "#a8782f", "#e4cf8e"]
  // Three overlapping lobes make a fuller, more tree-like crown than one ellipse.
  const lobes = [
    { x: 112, y: 100, rx: 92, ry: 66 },
    { x: 248, y: 100, rx: 92, ry: 66 },
    { x: 180, y: 66, rx: 100, ry: 62 },
  ]
  return Array.from({ length: 420 }, (_, i) => {
    const lobe = lobes[i % lobes.length]
    const angle = rand() * Math.PI * 2
    const dist = Math.sqrt(rand())
    return {
      cx: (lobe.x + Math.cos(angle) * dist * lobe.rx).toFixed(1),
      cy: (lobe.y + Math.sin(angle) * dist * lobe.ry).toFixed(1),
      r: (2 + rand() * 3.8).toFixed(1),
      fill: colours[Math.floor(rand() * colours.length)],
      opacity: (0.6 + rand() * 0.38).toFixed(2),
    }
  })
})()

function Canopy() {
  return (
    <svg
      viewBox="0 0 360 200"
      aria-hidden="true"
      className="pointer-events-none absolute left-6 md:left-1/2 -top-[132px] md:-top-[150px] w-[250px] md:w-[360px] -translate-x-[42%] md:-translate-x-1/2"
    >
      <g stroke="#8a6f4a" strokeLinecap="round" fill="none">
        <path d="M180 200 C178 170 170 150 150 125" strokeWidth="4" />
        <path d="M180 200 C184 168 196 148 220 120" strokeWidth="4" />
        <path d="M180 200 C181 160 179 130 182 96" strokeWidth="5" />
        <path d="M168 160 C150 150 128 148 108 130" strokeWidth="2" />
        <path d="M194 158 C214 150 238 146 258 128" strokeWidth="2" />
      </g>
      {LEAVES.map((l, i) => (
        <circle key={i} cx={l.cx} cy={l.cy} r={l.r} fill={l.fill} opacity={l.opacity} />
      ))}
    </svg>
  )
}

function Roots() {
  return (
    <svg
      viewBox="0 0 220 70"
      aria-hidden="true"
      className="pointer-events-none mx-0 md:mx-auto -mt-1 ml-[-3px] w-[170px] md:w-[220px]"
    >
      <g stroke="#8a6f4a" strokeLinecap="round" fill="none">
        <path d="M110 0 C108 22 96 34 62 46 C46 52 30 54 14 66" strokeWidth="4" />
        <path d="M110 0 C112 22 124 34 158 46 C174 52 190 54 206 66" strokeWidth="4" />
        <path d="M110 0 C110 26 104 44 96 68" strokeWidth="3" />
        <path d="M110 0 C112 26 118 44 126 68" strokeWidth="3" />
        <path d="M62 46 C52 56 50 62 40 68" strokeWidth="1.5" />
        <path d="M158 46 C168 56 172 62 182 68" strokeWidth="1.5" />
      </g>
      {[
        [30, 60], [50, 52], [70, 44], [150, 44], [172, 54], [192, 62], [96, 58], [128, 60],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3 + (i % 3)} fill="#c9a050" opacity="0.85" />
      ))}
    </svg>
  )
}

/**
 * Route guides on a parchment scroll: a golden tree grows up through the
 * scroll and each guide hangs off it like a labelled branch. Server-rendered
 * with no scroll animation, so every link is in the page HTML.
 */
export function PopularRoutes() {
  const routes = POPULAR_ROUTE_IDS.map((id) => ROUTE_GUIDES.find((r) => r.id === id)).filter(
    (r): r is (typeof ROUTE_GUIDES)[number] => r !== undefined,
  )

  return (
    <section
      className="relative overflow-hidden px-4 sm:px-6 pb-20 pt-44 md:pt-48"
      style={{ background: "linear-gradient(180deg, #e4e1db 0%, #d6d3cc 100%)" }}
      aria-labelledby="popular-routes-title"
    >
      <div className="relative mx-auto max-w-3xl">
        <Canopy />

        {/* Top roll */}
        <div
          className="relative z-10 -mx-2 h-9 rounded-[50%/14px]"
          style={{ background: PARCHMENT_ROLL, boxShadow: "0 6px 14px rgba(70,50,20,.25), inset 0 -2px 4px rgba(90,65,25,.25)" }}
        />

        {/* Scroll body */}
        <div
          className="relative -mt-3 px-5 sm:px-10 pb-10 pt-12"
          style={{
            background: PARCHMENT_BODY,
            boxShadow: "inset 0 0 60px rgba(120,85,35,.28), 0 10px 30px rgba(70,50,20,.18)",
          }}
        >
          <div className="text-center">
            <span className="block text-xs font-semibold uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>
              Route guides
            </span>
            <h2
              id="popular-routes-title"
              className="font-playfair italic font-normal text-3xl sm:text-4xl leading-tight"
              style={{ color: INK, letterSpacing: "-0.02em" }}
            >
              Popular routes across Ghana
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: MUTED }}>
              Distance, travel time, towns on the way and how to go by bus or trotro.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-[28px_1fr] md:grid-cols-[1fr_56px_1fr] gap-y-3.5">
            {/* Trunk */}
            <div
              aria-hidden="true"
              className="col-start-1 md:col-start-2 justify-self-center w-3 md:w-[18px] rounded-sm"
              style={{ gridRow: `1 / span ${routes.length}`, background: BARK, boxShadow: "0 0 0 1px rgba(60,40,15,.35)" }}
            />

            {routes.map((r, i) => {
              const left = i % 2 === 0
              return (
                <Link
                  key={r.id}
                  href={`/routes/${r.id}`}
                  style={{ gridRow: i + 1, borderColor: "#cdb88a", background: "linear-gradient(180deg,#f8f1de,#f1e6cc)" }}
                  className={[
                    "group relative col-start-2 rounded-md border px-4 py-3 shadow-[0_2px_6px_rgba(90,65,25,.18)] transition hover:-translate-y-0.5 hover:border-[#b8924a] hover:shadow-[0_5px_12px_rgba(90,65,25,.28)]",
                    left ? "md:col-start-1 md:mr-0" : "md:col-start-3",
                  ].join(" ")}
                >
                  {/* branch connecting the card to the trunk */}
                  <span
                    aria-hidden="true"
                    className={[
                      "absolute top-1/2 h-px w-3 right-full",
                      left ? "md:right-auto md:left-full md:w-7" : "md:w-7",
                    ].join(" ")}
                    style={{ background: GOLD }}
                  />
                  <span
                    aria-hidden="true"
                    className={[
                      "absolute top-1/2 -mt-[3px] h-1.5 w-1.5 rounded-full right-full -mr-[3px] md:mr-0",
                      left ? "md:right-auto md:left-full md:ml-[26px]" : "md:-mr-[28px]",
                    ].join(" ")}
                    style={{ background: GOLD }}
                  />
                  <span className="block font-playfair text-[17px] leading-snug" style={{ color: INK }}>
                    {r.from.name} to {r.to.name}
                  </span>
                  <span className="mt-0.5 block text-xs" style={{ color: MUTED }}>
                    {r.roadKm} km · {r.driveTime}
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="relative">
            <Roots />
          </div>

          <p className="mt-6 text-center">
            <Link
              href="/routes"
              className="text-sm font-medium underline underline-offset-4 decoration-[#b8924a]/60 hover:decoration-[#b8924a]"
              style={{ color: INK }}
            >
              See all route guides
            </Link>
          </p>
        </div>

        {/* Bottom roll */}
        <div
          className="relative z-10 -mx-2 -mt-3 h-9 rounded-[50%/14px]"
          style={{ background: PARCHMENT_ROLL, boxShadow: "0 10px 18px rgba(70,50,20,.3), inset 0 2px 4px rgba(255,245,220,.5)" }}
        />
      </div>
    </section>
  )
}
