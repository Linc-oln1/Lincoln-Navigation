import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteLinks } from "@/components/site-links"

export const metadata = {
  title: "Terms of Service — Lincoln Navigation",
  description:
    "The terms for using LincolnNavigation.com — in plain language, not legal boilerplate.",
}

const CONTACT_EMAIL = "info@lincolnnavigation.com"
const LAST_UPDATED = "25 September 2026"

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to LincolnNavigation
        </Link>

        <header className="mt-8 mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-3 text-muted-foreground">
            Last updated {LAST_UPDATED}. These are the terms for using
            LincolnNavigation.com (the &ldquo;app&rdquo;). Written in plain
            language, not legal boilerplate — see our{" "}
            <Link
              href="/privacy"
              className="text-foreground underline underline-offset-2"
            >
              Privacy Policy
            </Link>{" "}
            for how we handle your data. By using the app, you agree to
            these terms.
          </p>
        </header>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_p+p]:mt-3 [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <section>
            <h2>The short version</h2>
            <p>
              Use the app to find your way around Ghana. Don&rsquo;t abuse
              it, don&rsquo;t post fake or malicious hazard reports, and
              always use your own judgement on the road — the map is a
              tool, not a guarantee. We can suspend accounts that abuse
              the service, and you can stop using it, or delete your
              account, whenever you like.
            </p>
          </section>

          <section>
            <h2>Using the app</h2>
            <p>
              The core app — map, search, directions, weather, and
              viewing hazard reports — is free and doesn&rsquo;t require
              an account. Creating an account (email, Google, or in the
              future, phone) adds sync for saved places and trip history,
              and access to Premium. You must be able to form a binding
              agreement to use the app; it isn&rsquo;t directed at
              children under 13.
            </p>
          </section>

          <section>
            <h2>Your account</h2>
            <p>
              Keep your sign-in secure — you&rsquo;re responsible for
              activity on your account. Give us accurate information
              (your email) and let us know if you think your account has
              been compromised. You can sign out or delete your account
              at any time; see{" "}
              <Link
                href="/privacy"
                className="text-foreground underline underline-offset-2"
              >
                the Privacy Policy
              </Link>{" "}
              for how.
            </p>
          </section>

          <section>
            <h2>Hazard reports and other content you submit</h2>
            <p>
              Reporting a hazard, adding a note, or confirming/clearing
              one is a community contribution — it&rsquo;s anonymous (we
              never link a report to who sent it), and by submitting one
              you give us permission to show it to other users and store
              it for as long as it&rsquo;s relevant. Don&rsquo;t submit
              anything false, misleading, abusive, or unrelated to an
              actual road condition — we rate-limit and remove reports
              that look like spam or abuse.
            </p>
            <p>
              Hazard reports are submitted by other users, not verified
              by us, and can be wrong, outdated, or missing entirely.
              Never rely on the presence or absence of a report as your
              only source of safety information — drive to the
              conditions you actually see, and obey traffic laws and
              signage regardless of what the app shows.
            </p>
          </section>

          <section>
            <h2>Premium</h2>
            <p>
              Premium is a paid upgrade (currently GHS 30 for 31 days, shown on{" "}
              <Link
                href="/pricing"
                className="text-foreground underline underline-offset-2"
              >
                the pricing page
              </Link>
              ) that removes ads and raises the limits on saved places,
              trip history, and voice navigation. Payment is processed
              by Paystack. Today, Premium is billed as a one-time charge
              that unlocks Premium features for about 31 days — it
              doesn&rsquo;t automatically renew or charge you again, so
              there&rsquo;s nothing you need to cancel. If you want
              Premium to continue, you pay again once it lapses. We may
              change pricing or move to a recurring subscription in the
              future; if we do, we&rsquo;ll make the terms of that clear
              before you&rsquo;re charged. For billing questions, contact
              us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-foreground underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section>
            <h2>Map data and third-party services</h2>
            <p>
              Search, geocoding, routing, and weather are powered in part
              by third-party services (Mapbox, OpenStreetMap/Nominatim,
              Open-Meteo, OpenWeatherMap, OpenRouteService, OSRM) — see
              the full list in{" "}
              <Link
                href="/privacy"
                className="text-foreground underline underline-offset-2"
              >
                the Privacy Policy
              </Link>
              . We don&rsquo;t control the accuracy of that underlying
              data. Roads, addresses, and points of interest can be
              wrong, missing, or out of date, and weather forecasts are
              estimates. Use the app as a guide, not as your sole source
              of truth, especially in unfamiliar or fast-changing
              conditions.
            </p>
          </section>

          <section>
            <h2>Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>
                Use the app for anything illegal, or to help commit or
                plan illegal activity.
              </li>
              <li>
                Submit false hazard reports, spam, or content that
                harasses or endangers others.
              </li>
              <li>
                Try to bypass rate limits, Premium gating, or other
                access controls.
              </li>
              <li>
                Scrape, reverse-engineer, or resell the app&rsquo;s data
                or functionality at scale without our permission.
              </li>
              <li>
                Interfere with the app&rsquo;s normal operation (e.g.
                overloading our servers, injecting malicious code).
              </li>
            </ul>
          </section>

          <section>
            <h2>No warranty</h2>
            <p>
              The app is provided &ldquo;as is.&rdquo; We work to keep it
              accurate and available, but we don&rsquo;t guarantee
              uninterrupted service, error-free directions, or that
              every hazard on the road will be reported. You use the app,
              and drive, at your own judgement and risk.
            </p>
          </section>

          <section>
            <h2>Limitation of liability</h2>
            <p>
              To the extent permitted by law, LincolnNavigation.com
              isn&rsquo;t liable for indirect, incidental, or
              consequential damages arising from your use of the app —
              including missed turns, traffic incidents, or reliance on
              inaccurate map, weather, or hazard data. Nothing here
              limits liability that can&rsquo;t be limited under
              applicable law.
            </p>
          </section>

          <section>
            <h2>Suspending or ending access</h2>
            <p>
              We can suspend or terminate access for accounts that
              violate these terms — most commonly, abusing hazard
              reports or trying to bypass access controls. You can stop
              using the app, or delete your account, at any time; see{" "}
              <Link
                href="/privacy"
                className="text-foreground underline underline-offset-2"
              >
                the Privacy Policy
              </Link>{" "}
              for how.
            </p>
          </section>

          <section>
            <h2>Governing law</h2>
            <p>
              These terms are governed by the laws of Ghana, without
              regard to conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2>Changes to these terms</h2>
            <p>
              If these terms change in a meaningful way, we&rsquo;ll
              update the date at the top. Continuing to use the app
              after a change means you&rsquo;re okay with the update.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about these terms — use our{" "}
              <Link
                href="/contact"
                className="text-foreground underline underline-offset-2"
              >
                contact page
              </Link>{" "}
              or email us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-foreground underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <SiteLinks exclude="/terms" className="mt-12" />
      </div>
    </main>
  )
}
