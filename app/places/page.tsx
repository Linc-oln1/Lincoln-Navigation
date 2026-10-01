import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { JsonLd } from "@/components/seo/json-ld"
import { playfair } from "@/app/fonts/playfair"
import { GHANA_DESTINATIONS } from "@/lib/ghana-destinations"
import { blurb, categoryName, regionName } from "@/lib/place-guide"
import { pageMeta } from "@/lib/page-meta"
import { SITE_BASE } from "@/lib/site-base"

export const metadata = pageMeta({
  title: "Places to Visit in Ghana — Directions & Visitor Guides",
  description:
    "Cape Coast Castle, Kakum, Wli Falls, Mole and more: how to get to Ghana's best-loved places, with directions from Accra, Kumasi and Tamale.",
  path: "/places",
})

export default function PlacesPage() {
  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Places to visit in Ghana",
    itemListElement: GHANA_DESTINATIONS.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_BASE}/places/${d.id}`,
      name: d.name,
    })),
  }

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#1c2a33]">
      <JsonLd data={list} />
      <SiteHeader variant="light" />

      <section className="mx-auto max-w-5xl px-5 pb-16 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8702a]">Visitor guides</p>
        <h1 className={`${playfair.className} mt-3 text-4xl leading-tight sm:text-5xl`}>Places to visit in Ghana</h1>
        <p className="mt-4 max-w-2xl leading-relaxed opacity-80">
          Castles on the Atlantic coast, rainforest canopy walks, waterfalls, savanna wildlife and the landmarks of
          independence. Each guide covers the background, how people get there, what to know before you go — and opens
          turn-by-turn directions on the Lincoln Navigation map.
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GHANA_DESTINATIONS.map((d) => (
            <li key={d.id}>
              <Link
                href={`/places/${d.id}`}
                className="group block overflow-hidden rounded-3xl border border-black/10 bg-white/60 transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(28,42,51,0.35)]"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.photo}
                    alt={`${d.name}, ${regionName(d)}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60">
                    {regionName(d)} · {categoryName(d)}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{d.name}</h2>
                  <p className="mt-1 text-sm leading-snug opacity-75">{blurb(d)}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#c25a1c]">
                    How to get there <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm opacity-70">
          Want to plan a route right now?{" "}
          <Link href="/features" className="font-semibold underline underline-offset-2">Explore the destinations</Link>, see{" "}
          <Link href="/routes" className="font-semibold underline underline-offset-2">road trips in Ghana</Link> or{" "}
          <Link href="/app" className="font-semibold underline underline-offset-2">open the live map</Link>.
        </p>
      </section>

      <SiteFooter variant="light" />
    </main>
  )
}
