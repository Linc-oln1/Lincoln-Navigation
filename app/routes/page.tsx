import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { JsonLd } from "@/components/seo/json-ld"
import { playfair } from "@/app/fonts/playfair"
import { ROUTE_GUIDES } from "@/lib/route-guides"
import { pageMeta } from "@/lib/page-meta"
import { SITE_BASE } from "@/lib/site-base"

export const metadata = pageMeta({
  title: "Road Trips in Ghana — Distances, Travel Times & Directions",
  description:
    "Accra to Kumasi, Cape Coast, Takoradi and Tema, Kumasi to Tamale: road distances, driving times, the towns on the way and how to go by bus or trotro.",
  path: "/routes",
})

export default function RoutesPage() {
  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Road routes in Ghana",
    itemListElement: ROUTE_GUIDES.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_BASE}/routes/${r.id}`,
      name: `${r.from.name} to ${r.to.name}`,
    })),
  }

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#1c2a33]">
      <JsonLd data={list} />
      <SiteHeader variant="light" />

      <section className="mx-auto max-w-5xl px-5 pb-16 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8702a]">Route guides</p>
        <h1 className={`${playfair.className} mt-3 text-4xl leading-tight sm:text-5xl`}>Road trips in Ghana</h1>
        <p className="mt-4 max-w-2xl leading-relaxed opacity-80">
          How far it is, how long it really takes, the towns you pass and how to go by coach or trotro — for Ghana&apos;s
          most-travelled roads. Each guide opens turn-by-turn directions on the Lincoln Navigation map, with live hazards
          and weather on the way.
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {ROUTE_GUIDES.map((r) => (
            <li key={r.id}>
              <Link
                href={`/routes/${r.id}`}
                className="group block h-full rounded-3xl border border-black/10 bg-white/60 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(28,42,51,0.35)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60">{r.mainRoad}</p>
                <h2 className={`${playfair.className} mt-1 text-2xl`}>
                  {r.from.name} to {r.to.name}
                </h2>
                <p className="mt-2 text-sm font-semibold tabular-nums">
                  {r.roadKm} km · {r.driveTime}
                </p>
                <p className="mt-1 text-sm leading-snug opacity-75">{r.summary}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#c25a1c]">
                  Route guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm opacity-70">
          Going sightseeing?{" "}
          <Link href="/places" className="font-semibold underline underline-offset-2">See places to visit in Ghana</Link> or{" "}
          <Link href="/app" className="font-semibold underline underline-offset-2">open the live map</Link>.
        </p>
      </section>

      <SiteFooter variant="light" />
    </main>
  )
}
