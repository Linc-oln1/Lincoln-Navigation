import Link from "next/link"
import { Check } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { BusinessForm } from "@/components/business/business-form"
import { BUSINESS_CAPABILITIES, BUSINESS_SEGMENTS } from "@/lib/business"

export const metadata = {
  title: "For business — Lincoln Navigation",
  description:
    "Ghana-first navigation for logistics, delivery, taxi, ride-hailing, bus, insurance, government, automotive, university, developer and fleet customers.",
}

export default function BusinessPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            For business
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Navigation built for Ghana — for the businesses that keep it moving
          </h1>
          <p className="mt-4 text-muted-foreground">
            Lincoln Navigation isn&rsquo;t only an app for individual travellers. The same
            routing, live guidance and Ghana-first maps can power the companies,
            agencies and teams that move people and goods every day.
          </p>
          <Link
            href="#talk-to-us"
            className="mt-6 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Talk to us
          </Link>
        </header>

        <section className="mt-14" aria-labelledby="who-heading">
          <h2 id="who-heading" className="text-xl font-semibold">
            Who it&rsquo;s for
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_SEGMENTS.map(({ id, title, icon: Icon, body }) => (
              <div key={id} className="rounded-2xl border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 md:grid-cols-2" aria-labelledby="what-heading">
          <div>
            <h2 id="what-heading" className="text-xl font-semibold">
              What&rsquo;s already built
            </h2>
            <ul className="mt-4 space-y-2.5">
              {BUSINESS_CAPABILITIES.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Working with us</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We&rsquo;re opening access to business partners in stages. Tell us what you
              need — a pilot with a handful of drivers, an integration into your app, or
              a custom deployment — and we&rsquo;ll come back with what&rsquo;s possible
              now and what we can build together.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Developers and fleet teams can also just say hello and we&rsquo;ll add you to
              the early-access list.
            </p>
          </div>
        </section>

        <div className="mt-14 max-w-3xl">
          <BusinessForm />
        </div>
      </div>

      <SiteFooter />
    </main>
  )
}
