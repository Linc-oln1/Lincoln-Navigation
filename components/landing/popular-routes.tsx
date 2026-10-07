import Link from "next/link"
import { ArrowRight } from "lucide-react"
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

/**
 * Plain, always-visible list of route guides (distance, drive time) between
 * the hero sections and the footer. Server-rendered, no scroll animation, so
 * the links are in the page HTML.
 */
export function PopularRoutes() {
  const routes = POPULAR_ROUTE_IDS.map((id) => ROUTE_GUIDES.find((r) => r.id === id)).filter(
    (r): r is (typeof ROUTE_GUIDES)[number] => r !== undefined,
  )

  return (
    <section className="lithos-root relative bg-black py-20 px-6" aria-labelledby="popular-routes-title">
      <div className="max-w-4xl mx-auto">
        <span className="block text-[#e8702a] text-xs font-semibold tracking-[0.3em] uppercase mb-4 text-center">
          Route guides
        </span>
        <h2 id="popular-routes-title" className="text-white text-center leading-[1.05]">
          <span className="block font-playfair italic font-normal text-3xl sm:text-4xl" style={{ letterSpacing: "-0.03em" }}>
            Popular routes across Ghana
          </span>
        </h2>
        <p className="mt-4 text-center text-white/50 text-sm">
          Distance, travel time, towns on the way and how to go by bus or trotro.
        </p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {routes.map((r) => (
            <li key={r.id}>
              <Link
                href={`/routes/${r.id}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors hover:border-[#e8702a]/50 hover:bg-white/[0.06]"
              >
                <span>
                  <span className="block text-white font-medium">
                    {r.from.name} to {r.to.name}
                  </span>
                  <span className="block text-white/50 text-xs mt-0.5">
                    {r.roadKm} km · {r.driveTime}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[#e8702a]" />
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center">
          <Link href="/routes" className="text-sm text-[#e8702a] hover:underline underline-offset-4">
            See all route guides
          </Link>
        </p>
      </div>
    </section>
  )
}
