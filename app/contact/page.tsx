import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"
import { ContactForm } from "@/components/contact/contact-form"
import { ADVERTISE_CONTACT_EMAIL } from "@/lib/monetization"

export const metadata = {
  title: "Contact us — Lincoln Navigation",
  description:
    "Get in touch with the LincolnNavigation team — questions, feedback, bug reports and advertising.",
}

const INFO_EMAIL = "info@lincolnnavigation.com"

/* A deterministic city-block pattern, so the backdrop looks like a street map
   without shipping an image. */
function blocks() {
  let seed = 7
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  const out: { x: number; y: number; w: number; h: number }[] = []
  for (let col = 0; col < 16; col++) {
    for (let row = 0; row < 9; row++) {
      if (rnd() < 0.22) continue
      const w = 34 + rnd() * 34
      const h = 28 + rnd() * 30
      out.push({ x: col * 78 + rnd() * 10, y: row * 62 + rnd() * 10, w, h })
    }
  }
  return out
}
const BLOCKS = blocks()

function MapBackdrop() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 900 330"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g fill="none" stroke="#3b3b3b" strokeWidth="1.1" strokeLinejoin="round">
        <g transform="translate(-140 -190) rotate(28 450 330)">
          {BLOCKS.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="3" />
          ))}
        </g>
        <path d="M-20 90 C160 40 260 190 300 250 S420 330 520 290" strokeWidth="1.4" />
        <path d="M-20 120 C150 80 240 210 280 270 S410 350 520 315" strokeWidth="1.4" />
        <path d="M330 -10 L610 340" strokeWidth="2" stroke="#464646" />
        <path d="M372 -10 L652 340" strokeWidth="2" stroke="#464646" />
      </g>
    </svg>
  )
}

export default function ContactPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#c4c8d0] to-[#aeb2bc] px-4 py-10 text-neutral-900 sm:px-8 sm:py-16">
      {/* Logo as a soft blurred background — nothing layered over it */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/lincoln-navigation-mark.webp"
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 object-cover opacity-60 blur-[40px] saturate-[1.8]"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[920px]">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-neutral-950 transition-colors hover:text-black"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to LincolnNavigation
        </Link>

        <section className="relative rounded-xl bg-[#1d1d1d] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] md:min-h-[500px]">
          {/* Map band */}
          <div className="relative h-[330px] overflow-hidden rounded-t-xl bg-[#222] md:h-[335px]">
            <MapBackdrop />
            <div className="absolute left-[38%] top-[36%] z-10 -translate-x-1/2 -translate-y-1/2 sm:left-[42%]">
              <MapPin className="h-9 w-9 fill-white text-white drop-shadow" strokeWidth={1.5} />
            </div>

            <h1 className="absolute bottom-6 left-6 z-10 text-4xl font-bold tracking-tight text-white sm:left-[95px] sm:text-[42px]">
              Contact us
            </h1>
          </div>

          {/* Form card — overlaps the dark card on desktop, stacks on mobile */}
          <div className="relative z-20 mx-4 -mt-6 rounded-md bg-white p-6 shadow-xl md:absolute md:-top-2 md:right-8 md:mx-0 md:mt-0 md:min-h-[395px] md:w-[280px] md:overflow-visible md:p-[22px]">
            <ContactForm />
          </div>

          {/* Details */}
          <div className="grid gap-8 px-6 pb-10 pt-10 text-white sm:px-[95px] md:grid-cols-[1fr_1fr_280px] md:pt-14">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
                Where we are
              </p>
              <div className="mt-4 space-y-1.5 text-xs leading-relaxed text-white/90">
                <p>LincolnNavigation.com</p>
                <p>Accra, Ghana</p>
                <p>Serving all 16 regions</p>
              </div>
            </div>

            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
                Our contacts
              </p>
              <div className="mt-4 space-y-1.5 text-xs leading-relaxed text-white/90">
                <p>
                  <a href={`mailto:${INFO_EMAIL}`} className="hover:underline">{INFO_EMAIL}</a>
                </p>
                <p className="text-white/60">Advertising &amp; sponsors</p>
                <p>
                  <a href={`mailto:${ADVERTISE_CONTACT_EMAIL}`} className="hover:underline">
                    {ADVERTISE_CONTACT_EMAIL}
                  </a>
                </p>
              </div>
            </div>

            <div className="hidden md:block" />
          </div>
        </section>

        <p className="mt-6 text-right text-[11px] font-semibold text-neutral-950">
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          {"  ·  "}
          <Link href="/terms" className="hover:underline">Terms</Link>
        </p>
      </div>
    </main>
  )
}
