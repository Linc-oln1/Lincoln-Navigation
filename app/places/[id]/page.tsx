import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, MapPin, Navigation, Lightbulb, Route } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { JsonLd } from "@/components/seo/json-ld"
import { playfair } from "@/app/fonts/playfair"
import { GHANA_DESTINATIONS } from "@/lib/ghana-destinations"
import { DESTINATION_GUIDES, GUIDE_ORIGINS } from "@/lib/destination-guides"
import { blurb, categoryName, directionsHref, findDestination, kmBetween, nearestTo, regionName } from "@/lib/place-guide"
import { pageMeta } from "@/lib/page-meta"
import { SITE_BASE } from "@/lib/site-base"

// One visitor guide per destination on /features, built at deploy time.
export const dynamicParams = false

export function generateStaticParams() {
  return GHANA_DESTINATIONS.map((d) => ({ id: d.id }))
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const d = findDestination((await params).id)
  if (!d) return {}
  return pageMeta({
    title: `How to Get to ${d.name} — Visitor Guide`,
    description: `${blurb(d)} Directions from Accra, Kumasi and Tamale, and tips before you go.`,
    path: `/places/${d.id}`,
    image: { url: d.photo, alt: d.name },
  })
}

export default async function PlacePage({ params }: Props) {
  const d = findDestination((await params).id)
  const guide = d && DESTINATION_GUIDES[d.id]
  if (!d || !guide) notFound()

  const url = `${SITE_BASE}/places/${d.id}`
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristAttraction",
        "@id": `${url}#place`,
        name: d.name,
        description: blurb(d),
        url,
        image: `${SITE_BASE}${d.photo}`,
        geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng },
        address: { "@type": "PostalAddress", addressRegion: regionName(d), addressCountry: "GH" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_BASE },
          { "@type": "ListItem", position: 2, name: "Places in Ghana", item: `${SITE_BASE}/places` },
          { "@type": "ListItem", position: 3, name: d.name, item: url },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#1c2a33]">
      <JsonLd data={structuredData} />
      <SiteHeader variant="light" />

      <article className="mx-auto max-w-5xl px-5 pb-16 pt-8">
        <nav aria-label="Breadcrumb" className="text-xs opacity-60">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/places" className="hover:underline">Places in Ghana</Link>
          <span className="mx-1.5">/</span>
          <span>{d.name}</span>
        </nav>

        <header className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8702a]">
              {regionName(d)} · {categoryName(d)}
            </p>
            <h1 className={`${playfair.className} mt-3 text-4xl leading-tight sm:text-5xl`}>How to get to {d.name}</h1>
            <p className="mt-4 text-base leading-relaxed opacity-80">{blurb(d)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm opacity-70">
              <MapPin className="h-4 w-4" aria-hidden /> {guide.near}
            </p>
            <Link
              href={directionsHref(d)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#e8702a] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Navigation className="h-4 w-4" aria-hidden /> Get directions to {d.name}
            </Link>
          </div>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.photo}
              alt={`${d.name}, ${regionName(d)}, Ghana`}
              width={1200}
              height={900}
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-[0_20px_50px_-20px_rgba(28,42,51,0.45)]"
            />
            <figcaption className="mt-2 text-[11px] opacity-60">
              Photo:{" "}
              <a href={d.credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {d.credit.author}
              </a>
              , {d.credit.licence}, via Wikimedia Commons
            </figcaption>
          </figure>
        </header>

        <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-10">
            <section>
              <h2 className={`${playfair.className} text-2xl`}>About {d.name}</h2>
              {guide.about.map((p) => (
                <p key={p.slice(0, 32)} className="mt-3 leading-relaxed opacity-85">{p}</p>
              ))}
            </section>

            <section>
              <h2 className={`${playfair.className} flex items-center gap-2 text-2xl`}>
                <Route className="h-5 w-5 text-[#e8702a]" aria-hidden /> Getting there
              </h2>
              {guide.gettingThere.map((p) => (
                <p key={p.slice(0, 32)} className="mt-3 leading-relaxed opacity-85">{p}</p>
              ))}
              <p className="mt-3 leading-relaxed opacity-85">
                For live, turn-by-turn directions from wherever you are — by car, trotro, motorbike, bicycle or on foot — open{" "}
                <Link href={directionsHref(d)} className="font-semibold text-[#c25a1c] underline underline-offset-2">
                  {d.name} on the Lincoln Navigation map
                </Link>
                . It also shows the weather there and any road hazards reported along the way.
              </p>
            </section>

            <section>
              <h2 className={`${playfair.className} flex items-center gap-2 text-2xl`}>
                <Lightbulb className="h-5 w-5 text-[#e8702a]" aria-hidden /> Before you go
              </h2>
              <ul className="mt-3 space-y-2">
                {guide.tips.map((tip) => (
                  <li key={tip.slice(0, 32)} className="flex gap-2 leading-relaxed opacity-85">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#e8702a]" />
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-black/10 bg-white/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Distance from</h2>
              <ul className="mt-3 divide-y divide-black/10">
                {GUIDE_ORIGINS.map((o) => (
                  <li key={o.name} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{o.name}</span>
                    <span className="font-semibold tabular-nums">{Math.round(kmBetween(o, d)).toLocaleString("en")} km</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-snug opacity-60">
                Straight-line distance. The road distance is longer — the map gives the exact route and travel time.
              </p>
            </section>

            <section className="rounded-3xl border border-black/10 bg-white/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Nearby places</h2>
              <ul className="mt-3 space-y-3">
                {nearestTo(d, 3).map(({ place, km }) => (
                  <li key={place.id}>
                    <Link href={`/places/${place.id}`} className="group flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={place.photo} alt="" loading="lazy" className="h-12 w-16 flex-shrink-0 rounded-lg object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold group-hover:underline">{place.name}</span>
                        <span className="block text-xs opacity-60">{Math.round(km)} km away</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <Link
              href="/places"
              className="flex items-center justify-between rounded-3xl bg-[#1c2a33] px-5 py-4 text-sm font-semibold text-white transition hover:brightness-110"
            >
              All places in Ghana <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </aside>
        </div>
      </article>

      <SiteFooter variant="light" />
    </main>
  )
}
