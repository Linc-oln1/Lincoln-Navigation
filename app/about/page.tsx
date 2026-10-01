import Link from "next/link"
import { Compass, Route, MapPin, WifiOff } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { pageMeta } from "@/lib/page-meta"
import { JsonLd } from "@/components/seo/json-ld"
import { FOUNDER, founderPerson } from "@/lib/founder"
import { ORGANIZATION } from "@/lib/structured-data"

export const metadata = pageMeta({
  title: "About — Lincoln Navigation",
  description:
    "Lincoln Navigation is a maps and navigation app built for how Ghana actually moves.",
  path: "/about",
})

const PILLARS = [
  {
    icon: Route,
    title: "Every way you travel",
    body: "Directions by car, motorbike, trotro, bicycle or on foot — not just the one the map assumes.",
  },
  {
    icon: MapPin,
    title: "Places that are actually there",
    body: "Search real neighbourhoods and landmarks, and explore what's nearby wherever the map is pointed.",
  },
  {
    icon: WifiOff,
    title: "Yours to keep",
    body: "Installs to your phone like an app, works in any browser, and the core map is free — no store, no sign-up required.",
  },
  {
    icon: Compass,
    title: "Open at the core",
    body: "Built on map data anyone can correct and improve, so the map of Ghana keeps getting better.",
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-neutral-300">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [ORGANIZATION, founderPerson()] }} />
      <SiteHeader variant="gold" />
      {/* ---- hero: the emblem art ----
           Background art lives at /public/lincoln-navigation-hero.webp
           (the dark-textured emblem). Until it's added, the radial
           glow below keeps the band looking intentional. */}
      <section
        className="relative flex min-h-[58vh] items-start"
        style={{
          backgroundColor: "#0d0d0d",
          backgroundImage:
            "radial-gradient(ellipse at 50% 38%, rgba(201,160,110,0.14), transparent 60%), linear-gradient(to bottom, rgba(13,13,13,0) 55%, #0d0d0d 100%), url('/lincoln-navigation-hero.webp')",
          backgroundSize: "auto, auto, cover",
          backgroundPosition: "center, center, center",
          backgroundRepeat: "no-repeat, no-repeat, no-repeat",
        }}
      >
      </section>

      {/* ---- story ---- */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a06e]">
          About
        </p>
        <h1
          className="mt-3 text-3xl leading-tight text-neutral-100 sm:text-4xl"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}
        >
          The clearest way across Ghana
        </h1>

        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-neutral-400">
          <p>
            Lincoln Navigation is a maps and navigation app built for Ghana.
          </p>
          <p>
            Most map apps treat the country as an afterthought — routes that
            ignore how people actually get around, search that misses the
            neighbourhood you asked for, directions that assume everyone drives
            a car. Lincoln Navigation starts from the opposite place: a clear
            path through every street, roundabout and detour, built for how
            Ghana actually moves.
          </p>
          <p>
            Search anywhere, get directions by car, motorbike, trotro, bicycle
            or on foot, explore what&rsquo;s nearby, and save the places you go.
            It runs in your browser and installs to your phone like an app.
          </p>
          <p>
            The map is built on open data that anyone can improve, and the core
            app is free and stays free. A Premium plan adds turn-by-turn voice
            navigation and unlimited saved places.
          </p>
        </div>

        {/* ---- pillars ---- */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#c9a06e]/15 bg-[#161310] p-5"
            >
              <Icon className="h-5 w-5 text-[#c9a06e]" />
              <h2 className="mt-3 text-sm font-semibold text-neutral-100">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-neutral-400">{body}</p>
            </div>
          ))}
        </div>

        {/* ---- founder ---- */}
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a06e]">Founder</h2>
          <Link
            href={FOUNDER.path}
            className="group mt-4 flex items-center gap-5 rounded-2xl border border-[#c9a06e]/15 bg-[#161310] p-4 transition hover:border-[#c9a06e]/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FOUNDER.photoSquare}
              alt={FOUNDER.name}
              width={88}
              height={88}
              className="h-20 w-20 flex-shrink-0 rounded-xl object-cover sm:h-[88px] sm:w-[88px]"
            />
            <div className="min-w-0">
              <p className="text-base font-semibold text-neutral-100">
                {FOUNDER.name} <span className="font-normal text-[#d9b98c]">({FOUNDER.knownAs})</span>
              </p>
              <p className="text-sm text-[#c9a06e]">{FOUNDER.title}</p>
              <p className="mt-1 hidden text-sm text-neutral-400 sm:block">
                Building world-class location technology from Africa, starting with Ghana.
              </p>
              <span className="mt-1.5 inline-block text-sm font-semibold text-[#d9b98c] group-hover:underline">
                Read the profile →
              </span>
            </div>
          </Link>
        </section>

        {/* ---- CTA ---- */}
        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-[#c9a06e] px-5 py-2.5 text-sm font-semibold text-[#1a1206] transition hover:brightness-105"
          >
            Open the map
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-[#c9a06e]/30 px-5 py-2.5 text-sm font-semibold text-[#d9b98c] transition hover:bg-[#c9a06e]/10"
          >
            See Premium
          </Link>
        </div>
      </section>
      <SiteFooter variant="gold" />
    </main>
  )
}
