import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, Bus, Car, Clock, Lightbulb, Navigation, Route } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { JsonLd } from "@/components/seo/json-ld"
import { playfair } from "@/app/fonts/playfair"
import { ROUTE_GUIDES, findRoute, routeDirectionsHref } from "@/lib/route-guides"
import { blurb, findDestination } from "@/lib/place-guide"
import { pageMeta } from "@/lib/page-meta"
import { SITE_BASE } from "@/lib/site-base"

// One guide per route in lib/route-guides.ts, built at deploy time.
export const dynamicParams = false

export function generateStaticParams() {
  return ROUTE_GUIDES.map((r) => ({ id: r.id }))
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const r = findRoute((await params).id)
  if (!r) return {}
  return pageMeta({
    title: `${r.from.name} to ${r.to.name}: Distance, Travel Time & Directions`,
    description: `${r.summary} The towns on the way, bus and trotro options, and tips for the drive.`,
    path: `/routes/${r.id}`,
  })
}

export default async function RoutePage({ params }: Props) {
  const r = findRoute((await params).id)
  if (!r) notFound()

  const title = `${r.from.name} to ${r.to.name}`
  const url = `${SITE_BASE}/routes/${r.id}`
  const stops = [r.from.name, ...r.via, r.to.name]
  const places = r.places.map(findDestination).filter((d) => d !== undefined)
  const others = ROUTE_GUIDES.filter((o) => o.id !== r.id)

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: `${title} — route guide`,
        description: r.summary,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_BASE },
          { "@type": "ListItem", position: 2, name: "Routes in Ghana", item: `${SITE_BASE}/routes` },
          { "@type": "ListItem", position: 3, name: title, item: url },
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
          <Link href="/routes" className="hover:underline">Routes in Ghana</Link>
          <span className="mx-1.5">/</span>
          <span>{title}</span>
        </nav>

        <header className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8702a]">{r.mainRoad}</p>
          <h1 className={`${playfair.className} mt-3 text-4xl leading-tight sm:text-5xl`}>
            {title} by road
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed opacity-80">{r.summary}</p>

          <dl className="mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-60">
                <Route className="h-3.5 w-3.5" aria-hidden /> Distance
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{r.roadKm} km</dd>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-60">
                <Clock className="h-3.5 w-3.5" aria-hidden /> By car
              </dt>
              <dd className="mt-1 text-xl font-semibold">{r.driveTime}</dd>
            </div>
            <div className="col-span-2 rounded-2xl border border-black/10 bg-white/60 p-4 sm:col-span-1">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-60">
                <Car className="h-3.5 w-3.5" aria-hidden /> Main road
              </dt>
              <dd className="mt-1 text-sm font-semibold leading-snug">{r.mainRoad}</dd>
            </div>
          </dl>

          <Link
            href={routeDirectionsHref(r)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#e8702a] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Navigation className="h-4 w-4" aria-hidden /> Get directions to {r.to.name}
          </Link>
        </header>

        <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-10">
            <section>
              <h2 className={`${playfair.className} flex items-center gap-2 text-2xl`}>
                <Car className="h-5 w-5 text-[#e8702a]" aria-hidden /> Driving from {r.from.name} to {r.to.name}
              </h2>
              {r.driving.map((p) => (
                <p key={p.slice(0, 32)} className="mt-3 leading-relaxed opacity-85">{p}</p>
              ))}
            </section>

            <section>
              <h2 className={`${playfair.className} flex items-center gap-2 text-2xl`}>
                <Bus className="h-5 w-5 text-[#e8702a]" aria-hidden /> By bus or trotro
              </h2>
              {r.publicTransport.map((p) => (
                <p key={p.slice(0, 32)} className="mt-3 leading-relaxed opacity-85">{p}</p>
              ))}
              <p className="mt-3 leading-relaxed opacity-85">
                Fares change often, so check at the station before you travel. For live directions — by car, bus,
                motorbike, bicycle or on foot — open{" "}
                <Link href={routeDirectionsHref(r)} className="font-semibold text-[#c25a1c] underline underline-offset-2">
                  {r.to.name} on the Lincoln Navigation map
                </Link>
                . It shows road hazards other drivers have reported and the weather along the way.
              </p>
            </section>

            <section>
              <h2 className={`${playfair.className} flex items-center gap-2 text-2xl`}>
                <Lightbulb className="h-5 w-5 text-[#e8702a]" aria-hidden /> Tips for the trip
              </h2>
              <ul className="mt-3 space-y-2">
                {r.tips.map((tip) => (
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
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">On the way</h2>
              <ol className="mt-4">
                {stops.map((town, i) => {
                  const end = i === 0 || i === stops.length - 1
                  return (
                    <li key={town} className="relative flex items-center gap-3 pb-4 last:pb-0">
                      {i < stops.length - 1 && (
                        <span aria-hidden className="absolute left-[5px] top-3 h-full w-0.5 bg-[#e8702a]/30" />
                      )}
                      <span
                        aria-hidden
                        className={`relative h-3 w-3 flex-shrink-0 rounded-full ${end ? "bg-[#e8702a]" : "border-2 border-[#e8702a] bg-[#f4f1e8]"}`}
                      />
                      <span className={`text-sm ${end ? "font-semibold" : "opacity-80"}`}>{town}</span>
                    </li>
                  )
                })}
              </ol>
              <p className="mt-4 text-[11px] leading-snug opacity-60">
                Distance is by road between the city centres. The map gives the exact route and live travel time from
                where you are.
              </p>
            </section>

            {places.length > 0 && (
              <section className="rounded-3xl border border-black/10 bg-white/60 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Worth a stop</h2>
                <ul className="mt-3 space-y-3">
                  {places.map((place) => (
                    <li key={place.id}>
                      <Link href={`/places/${place.id}`} className="group flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={place.photo} alt="" loading="lazy" className="h-12 w-16 flex-shrink-0 rounded-lg object-cover" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold group-hover:underline">{place.name}</span>
                          <span className="line-clamp-1 block text-xs opacity-60">{blurb(place)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-3xl border border-black/10 bg-white/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Other routes</h2>
              <ul className="mt-3 divide-y divide-black/10">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link href={`/routes/${o.id}`} className="flex items-center justify-between py-2.5 text-sm hover:underline">
                      <span>{o.from.name} to {o.to.name}</span>
                      <span className="tabular-nums opacity-60">{o.roadKm} km</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <Link
              href="/routes"
              className="flex items-center justify-between rounded-3xl bg-[#1c2a33] px-5 py-4 text-sm font-semibold text-white transition hover:brightness-110"
            >
              All routes in Ghana <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </aside>
        </div>
      </article>

      <SiteFooter variant="light" />
    </main>
  )
}
