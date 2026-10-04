import Link from "next/link"
import { ArrowRight, Mail } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { JsonLd } from "@/components/seo/json-ld"
import { COMPANY_LEGAL_NAME, FOUNDER, FOUNDING_PLACE, FOUNDING_YEAR, founderPerson } from "@/lib/founder"
import { CONTACT_EMAIL } from "@/lib/legal"
import { pageMeta } from "@/lib/page-meta"
import { SITE_BASE } from "@/lib/site-base"
import { ORGANIZATION } from "@/lib/structured-data"

export const metadata = pageMeta({
  title: `${FOUNDER.name} (${FOUNDER.knownAs}) — Founder & CEO of Lincoln Navigation`,
  description: FOUNDER.summary,
  path: FOUNDER.path,
  image: { url: FOUNDER.photoSquare, alt: `${FOUNDER.name}, ${FOUNDER.title} of Lincoln Navigation` },
})

const PLAYFAIR = { fontFamily: "'Playfair Display', Georgia, serif" }

export default function FounderPage() {
  const url = `${SITE_BASE}${FOUNDER.path}`
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ProfilePage", "@id": url, url, name: `${FOUNDER.name} — ${FOUNDER.title}`, mainEntity: { "@id": `${url}#person` } },
      founderPerson(),
      ORGANIZATION,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_BASE },
          { "@type": "ListItem", position: 2, name: "About", item: `${SITE_BASE}/about` },
          { "@type": "ListItem", position: 3, name: FOUNDER.name, item: url },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-neutral-300">
      <JsonLd data={structuredData} />
      <SiteHeader variant="gold" />

      <article className="mx-auto max-w-5xl px-5 pb-16 pt-8">
        <nav aria-label="Breadcrumb" className="text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-300">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/about" className="hover:text-neutral-300">About</Link>
          <span className="mx-1.5">/</span>
          <span className="text-neutral-400">{FOUNDER.name}</span>
        </nav>

        <header className="mt-8 grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
          <figure className="mx-auto w-full max-w-sm md:max-w-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FOUNDER.photo}
              alt={`${FOUNDER.name}, ${FOUNDER.title} of Lincoln Navigation`}
              width={800}
              height={1000}
              className="aspect-[4/5] w-full rounded-3xl border border-[#c9a06e]/20 object-cover"
            />
          </figure>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a06e]">{FOUNDER.title}</p>
            <h1 className="mt-3 text-4xl leading-tight text-neutral-100 sm:text-5xl" style={PLAYFAIR}>
              {FOUNDER.name} <span className="text-[#d9b98c]">({FOUNDER.knownAs})</span>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-neutral-400">{FOUNDER.summary}</p>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-[#c9a06e]/15 pt-5 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Company</dt>
                <dd className="mt-1 text-neutral-200">{COMPANY_LEGAL_NAME}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Founded</dt>
                <dd className="mt-1 text-neutral-200">{FOUNDING_YEAR}, {FOUNDING_PLACE.split(",")[0]}</dd>
              </div>
            </dl>

            <ul className="mt-6 flex flex-wrap gap-2">
              {FOUNDER.profiles.map((p) => (
                <li key={p.href}>
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer me"
                    className="inline-flex items-center rounded-full border border-[#c9a06e]/30 px-4 py-1.5 text-sm font-medium text-[#d9b98c] transition hover:bg-[#c9a06e]/10"
                  >
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <div className="mx-auto mt-14 max-w-3xl">
          <h2 className="text-2xl text-neutral-100" style={PLAYFAIR}>About Jonathan</h2>
          <div className="mt-5 space-y-5 text-[15px] leading-relaxed text-neutral-400">
            {FOUNDER.bio.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>

          <h2 className="mt-12 text-2xl text-neutral-100" style={PLAYFAIR}>Photos</h2>
          <ul className="mt-5 grid max-w-xs grid-cols-1 gap-3">
            {FOUNDER.gallery.map((g) => (
              <li key={g.src}>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.src}
                    alt={g.alt}
                    width={1200}
                    height={1600}
                    loading="lazy"
                    className="aspect-[3/4] w-full rounded-2xl border border-[#c9a06e]/20 object-cover"
                  />
                  <figcaption className="mt-2 text-xs text-neutral-500">{g.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>

          <blockquote className="mt-10 rounded-2xl border border-[#c9a06e]/20 bg-[#161310] px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a06e]">Vision</p>
            <p className="mt-3 text-xl leading-snug text-neutral-100" style={{ ...PLAYFAIR, fontStyle: "italic" }}>
              &ldquo;{FOUNDER.vision}&rdquo;
            </p>
          </blockquote>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c9a06e] px-5 py-2.5 text-sm font-semibold text-[#1a1206] transition hover:brightness-105"
            >
              <Mail className="h-4 w-4" aria-hidden /> Press &amp; partnerships
            </a>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-xl border border-[#c9a06e]/30 px-5 py-2.5 text-sm font-semibold text-[#d9b98c] transition hover:bg-[#c9a06e]/10"
            >
              About Lincoln Navigation <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter variant="gold" />
    </main>
  )
}
