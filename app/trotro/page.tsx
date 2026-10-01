import Link from "next/link"
import { ArrowRight, Bus, Coins, Hand, Lightbulb, MapPin, Megaphone } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { JsonLd } from "@/components/seo/json-ld"
import { playfair } from "@/app/fonts/playfair"
import { ROUTE_GUIDES } from "@/lib/route-guides"
import { pageMeta } from "@/lib/page-meta"
import { SITE_BASE } from "@/lib/site-base"

// How trotros work, for first-timers. Kept to well-established facts;
// fares and individual lines change, so the page never quotes them.

export const metadata = pageMeta({
  title: "How to Ride a Trotro in Ghana — Stations, Paying & Tips",
  description:
    "A first-timer's guide to Ghana's trotros: what they are, where to catch one in Accra and Kumasi, how the mate works, paying, getting off and staying safe.",
  path: "/trotro",
})

const STEPS = [
  {
    icon: MapPin,
    title: "Find the right trotro",
    body: [
      "At a station, trotros for each destination load in their own lane or bay. Ask anyone — a driver, a mate or a trader — \"Where is the car for Madina?\" and they'll point you to it. Get in, take a seat, and the trotro leaves once every seat is filled.",
      "On the road, stand where people are already waiting. Trotros slow down as they pass and the mate calls out where they're going. Wave one down and confirm the destination with the mate before you climb in.",
    ],
  },
  {
    icon: Megaphone,
    title: "Listen to the mate",
    body: [
      "Every trotro has a driver and a mate — the conductor who leans out of the sliding door, calls the route, collects fares and tells the driver when to stop. Mates shout destinations in a quick, clipped way — \"Circle! Circle!\" or \"Kaneshie-Kaneshie!\" — so listen for the place name.",
      "Regular passengers often use hand signals at the roadside to show which way they're going. You don't need to learn them: just say where you're going and the mate will tell you yes or no.",
    ],
  },
  {
    icon: Coins,
    title: "Pay the mate",
    body: [
      "You pay the mate during the trip, not the driver. Fares depend on how far you're going and are set for each route, so ask another passenger if you're unsure what to pay.",
      "Carry small notes and coins. Mates often run short of change, especially early in the morning, and a large note can mean a wait for your change.",
    ],
  },
  {
    icon: Hand,
    title: "Get off at your stop",
    body: [
      "Tell the mate where you want to get off when you pay, and call out \"Bus stop!\" as you get close. The trotro pulls over and the people between you and the door step out or fold their seat forward to let you through.",
      "If you're not sure where your stop is, ask the mate to tell you when you get there — most will.",
    ],
  },
]

const STATIONS = [
  {
    city: "Accra",
    rows: [
      ["Kwame Nkrumah Circle", "The city's busiest transport hub. Trotros to most parts of Accra, and Neoplan buses towards Kumasi."],
      ["Kaneshie", "West of the centre. Trotros and buses for Kasoa and the west, including Cape Coast and Takoradi."],
      ["Tema station", "In central Accra near Makola Market. Trotros for Tema and the eastern side of the city."],
      ["Madina", "The main hub in the north-east, for Legon, Adenta and beyond."],
      ["Achimota", "In the north-west, for routes up towards Amasaman and Nsawam."],
    ],
  },
  {
    city: "Kumasi",
    rows: [
      ["Kejetia", "The central station beside Kejetia Market, with trotros across Kumasi and buses to other cities."],
      ["Other stations", "Smaller stations around the city serve particular routes — ask at Kejetia which one you need."],
    ],
  },
]

const TIPS = [
  "Avoid rush hour if you can — roughly 6–9 a.m. into town and 4–7 p.m. out — when queues at stations are long and trotros fill instantly.",
  "Keep your phone and wallet in a front pocket or a bag on your lap, especially in busy stations.",
  "The front seat next to the driver has more room and is the easiest to get out of.",
  "If a trotro looks full but the mate waves you in, there's usually one more seat — or a fold-down seat by the door.",
  "Routes change and new stations open, so when in doubt, ask. People are generally happy to help.",
]

export default function TrotroPage() {
  const url = `${SITE_BASE}/trotro`
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: "How to ride a trotro in Ghana",
        description:
          "What trotros are, where to catch one in Accra and Kumasi, how the mate works, paying, getting off and staying safe.",
        url,
        inLanguage: "en",
        author: { "@id": `${SITE_BASE}/#organization` },
        publisher: { "@id": `${SITE_BASE}/#organization` },
        about: { "@type": "Thing", name: "Trotro", description: "Shared minibus public transport in Ghana" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_BASE },
          { "@type": "ListItem", position: 2, name: "Trotro guide", item: url },
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
          <span>Trotro guide</span>
        </nav>

        <header className="mt-5 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8702a]">Getting around Ghana</p>
          <h1 className={`${playfair.className} mt-3 text-4xl leading-tight sm:text-5xl`}>How to ride a trotro</h1>
          <p className="mt-4 text-base leading-relaxed opacity-80">
            Trotros are the shared minibuses that carry most of Ghana&apos;s commuters — cheap, frequent and everywhere.
            They can look chaotic the first time, but there&apos;s a simple system behind them. Here&apos;s how it works.
          </p>
        </header>

        <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-10">
            <section>
              <h2 className={`${playfair.className} flex items-center gap-2 text-2xl`}>
                <Bus className="h-5 w-5 text-[#e8702a]" aria-hidden /> What is a trotro?
              </h2>
              <p className="mt-3 leading-relaxed opacity-85">
                A trotro is a privately owned minibus — usually a Toyota HiAce, Mercedes Sprinter or similar van with
                rows of bench seats — that runs a fixed route between stations, picking up and dropping off passengers
                along the way. The name is often traced to the Ga word &ldquo;tro&rdquo;, a threepence coin that was
                once the fare.
              </p>
              <p className="mt-3 leading-relaxed opacity-85">
                There&apos;s no printed timetable or route map. Trotros run from early morning into the evening, leave
                stations when they&apos;re full, and stop wherever passengers want to get on or off.
              </p>
            </section>

            {STEPS.map((s, i) => (
              <section key={s.title}>
                <h2 className={`${playfair.className} flex items-center gap-2 text-2xl`}>
                  <s.icon className="h-5 w-5 text-[#e8702a]" aria-hidden />
                  <span>
                    <span className="opacity-50">{i + 1}.</span> {s.title}
                  </span>
                </h2>
                {s.body.map((p) => (
                  <p key={p.slice(0, 32)} className="mt-3 leading-relaxed opacity-85">{p}</p>
                ))}
              </section>
            ))}

            <section>
              <h2 className={`${playfair.className} text-2xl`}>Main trotro stations</h2>
              <p className="mt-3 leading-relaxed opacity-85">
                Big stations are where routes start and end. These are some of the best known — routes change, so ask
                at the station if you&apos;re unsure.
              </p>
              {STATIONS.map((c) => (
                <div key={c.city} className="mt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-70">{c.city}</h3>
                  <dl className="mt-2 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white/60">
                    {c.rows.map(([name, desc]) => (
                      <div key={name} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-sm font-semibold">{name}</dt>
                        <dd className="text-sm leading-relaxed opacity-80">{desc}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </section>

            <section>
              <h2 className={`${playfair.className} flex items-center gap-2 text-2xl`}>
                <Lightbulb className="h-5 w-5 text-[#e8702a]" aria-hidden /> Tips for first-timers
              </h2>
              <ul className="mt-3 space-y-2">
                {TIPS.map((tip) => (
                  <li key={tip.slice(0, 32)} className="flex gap-2 leading-relaxed opacity-85">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#e8702a]" />
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-[#1c2a33] p-5 text-white">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Plan the trip</h2>
              <p className="mt-2 text-sm leading-relaxed opacity-85">
                Choose <strong>Bus</strong> on the Lincoln Navigation map to see the road route and a realistic travel
                time for a trotro or bus, with road hazards and weather on the way. It doesn&apos;t show individual
                trotro lines yet — the station will tell you which car to take.
              </p>
              <Link
                href="/app"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#e8702a] px-4 py-2.5 text-sm font-semibold transition hover:brightness-110"
              >
                Open the map <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </section>

            <section className="rounded-3xl border border-black/10 bg-white/60 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">Going further?</h2>
              <ul className="mt-3 divide-y divide-black/10">
                {ROUTE_GUIDES.map((r) => (
                  <li key={r.id}>
                    <Link href={`/routes/${r.id}`} className="flex items-center justify-between py-2.5 text-sm hover:underline">
                      <span>{r.from.name} to {r.to.name}</span>
                      <span className="tabular-nums opacity-60">{r.roadKm} km</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <Link
              href="/places"
              className="flex items-center justify-between rounded-3xl border border-black/10 bg-white/60 px-5 py-4 text-sm font-semibold transition hover:bg-white"
            >
              Places to visit in Ghana <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </aside>
        </div>
      </article>

      <SiteFooter variant="light" />
    </main>
  )
}
