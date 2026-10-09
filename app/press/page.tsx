import Link from "next/link"
import { Mail } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { JsonLd } from "@/components/seo/json-ld"
import { COMPANY_LEGAL_NAME, FOUNDER, FOUNDING_PLACE, FOUNDING_YEAR, founderPerson } from "@/lib/founder"
import { CONTACT_EMAIL } from "@/lib/legal"
import { pageMeta } from "@/lib/page-meta"
import { SITE_BASE } from "@/lib/site-base"
import { ORGANIZATION } from "@/lib/structured-data"

export const metadata = pageMeta({
  title: "Press kit — Lincoln Navigation and founder Jonathan Kwaku Abra",
  description: `Press kit for Lincoln Navigation, the maps and navigation platform built for Ghana: company facts, founder biography and photos of ${FOUNDER.name} (${FOUNDER.knownAs}), Founder & CEO.`,
  path: "/press",
  image: { url: FOUNDER.photoSquare, alt: `${FOUNDER.name}, ${FOUNDER.title} of Lincoln Navigation` },
})

const PLAYFAIR = { fontFamily: "'Playfair Display', Georgia, serif" }

export default function PressPage() {
  const photos = FOUNDER.gallery
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE_BASE}/press`, url: `${SITE_BASE}/press`, name: "Lincoln Navigation press kit", about: { "@id": `${SITE_BASE}/#organization` } },
      founderPerson(),
      ORGANIZATION,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_BASE },
          { "@type": "ListItem", position: 2, name: "Press kit", item: `${SITE_BASE}/press` },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-neutral-300">
      <JsonLd data={structuredData} />
      <SiteHeader variant="gold" />

      <article className="mx-auto max-w-4xl px-5 pb-16 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a06e]">Press kit</p>
        <h1 className="mt-3 text-4xl leading-tight text-neutral-100 sm:text-5xl" style={PLAYFAIR}>
          Lincoln Navigation
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-neutral-400">
          Lincoln Navigation is a maps and navigation platform built for Ghana, founded in {FOUNDING_YEAR} in{" "}
          {FOUNDING_PLACE.split(",")[0]} by {FOUNDER.name} ({FOUNDER.knownAs}), Founder &amp; CEO of {COMPANY_LEGAL_NAME}.
        </p>

        <dl className="mt-8 grid gap-4 border-t border-[#c9a06e]/15 pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Founder &amp; CEO</dt>
            <dd className="mt-1 text-neutral-200">
              <Link href={FOUNDER.path} className="hover:underline">{FOUNDER.name} ({FOUNDER.knownAs})</Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Company</dt>
            <dd className="mt-1 text-neutral-200">{COMPANY_LEGAL_NAME}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Website</dt>
            <dd className="mt-1 text-neutral-200">www.lincolnnavigation.com</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Press contact</dt>
            <dd className="mt-1 text-neutral-200">{CONTACT_EMAIL}</dd>
          </div>
        </dl>

        <h2 className="mt-12 text-2xl text-neutral-100" style={PLAYFAIR}>About the founder</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-neutral-400">{FOUNDER.summary}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-neutral-400">{FOUNDER.bio[1]}</p>

        <h2 className="mt-12 text-2xl text-neutral-100" style={PLAYFAIR}>Photos of {FOUNDER.name}</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Free to use with the credit &ldquo;{FOUNDER.name} ({FOUNDER.knownAs}), Founder &amp; CEO, Lincoln Navigation&rdquo;.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          {photos.map((g) => (
            <figure key={g.src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.src}
                alt={g.alt}
                width={g.width}
                height={g.height}
                loading="lazy"
                className="aspect-[2/3] w-full rounded-2xl border border-[#c9a06e]/20 object-cover"
              />
              <figcaption className="mt-2 text-xs leading-snug text-neutral-500">
                {g.caption}.{" "}
                <a href={g.src} download className="font-semibold text-[#d9b98c] hover:underline">Download</a>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-10">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#c9a06e] px-5 py-2.5 text-sm font-semibold text-[#1a1206] transition hover:brightness-105"
          >
            <Mail className="h-4 w-4" aria-hidden /> Contact press team
          </a>
        </div>
      </article>

      <SiteFooter variant="gold" />
    </main>
  )
}
