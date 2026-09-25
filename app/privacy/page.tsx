import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Privacy Policy — Lincoln Navigation",
  description:
    "What LincolnNavigation.com collects, why, and how it's used — in plain language.",
}

const CONTACT_EMAIL = "lincolnjonathan8@gmail.com"
const LAST_UPDATED = "25 September 2026"

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-muted-foreground">
            Last updated {LAST_UPDATED}. This page explains what
            LincolnNavigation.com collects, why, and who it&rsquo;s shared
            with — written in plain language, not legal boilerplate. It
            isn&rsquo;t legal advice, just an honest account of how the app
            actually works.
          </p>
        </header>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_p+p]:mt-3 [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <section>
            <h2>The short version</h2>
            <p>
              You can use the map, search, and directions without an
              account or giving us anything. Signing in only adds sync
              (saved places, trip history) and Premium. Hazard reports are
              anonymous — we never link one to who sent it. We don&rsquo;t
              sell your data to anyone.
            </p>
          </section>

          <section>
            <h2>Account information</h2>
            <p>
              If you sign in, we store your email address and, if you use
              Google to sign in, whatever basic profile info Google shares
              for that (typically your name and avatar). If you continue
              as a guest, none of this applies — nothing is collected.
            </p>
            <p>
              Signing in keeps you signed in on that device using a secure
              session cookie issued by our auth provider, Supabase. It
              contains a signed token, not your password.
            </p>
          </section>

          <section>
            <h2>Saved places &amp; trip history</h2>
            <p>
              If you&rsquo;re signed in, favourites, home/work, and recent
              searches (name, address, coordinates) are stored on our
              servers against your account so they follow you across
              devices. If you&rsquo;re signed out, the same information
              stays only in your browser&rsquo;s local storage and is
              never sent to us.
            </p>
          </section>

          <section>
            <h2>Location</h2>
            <p>
              If you allow it, your browser&rsquo;s location is used to
              centre the map on you, set a &ldquo;current location&rdquo;
              starting point for directions, and track your position
              during turn-by-turn navigation. This happens on your device.
              A coordinate is sent to our servers only when it&rsquo;s
              needed to answer a specific request — looking up the
              weather at that spot, reverse-geocoding it to an address, or
              finding nearby hazards — and isn&rsquo;t stored against you
              unless you explicitly save it as a place.
            </p>
          </section>

          <section>
            <h2>Hazard reports</h2>
            <p>
              Reporting a hazard (police checkpoint, accident, flooding,
              and so on) is anonymous by design. We store the hazard
              itself — what it is, where it is, when it was reported, and
              any note you added — but never who reported it. To stop
              spam and duplicate votes, we generate a one-way scrambled
              code from your connection at the moment you report or
              vote, which can&rsquo;t be reversed to identify you and is
              never attached to the report. Your raw IP address and
              browser details are never stored.
            </p>
          </section>

          <section>
            <h2>Premium &amp; payments</h2>
            <p>
              If you subscribe to Premium, payment is handled entirely by
              our payment processor, Paystack, on their own secure
              checkout page — we never see or store your card details.
              After payment, we receive your email and the transaction
              reference back from Paystack, which we use to set a cookie
              confirming your Premium status on that device. That cookie
              is signed to prevent tampering and includes your billing
              email so we can confirm the subscription is yours; it
              isn&rsquo;t readable by anyone but your browser and our
              servers.
            </p>
          </section>

          <section>
            <h2>Cookies</h2>
            <p>We use a small number of cookies:</p>
            <ul>
              <li>
                <strong>Sign-in session</strong> — keeps you signed in,
                only set if you create an account.
              </li>
              <li>
                <strong>Premium status</strong> — confirms an active
                subscription, only set if you subscribe.
              </li>
              <li>
                <strong>Advertising</strong> — if display ads are shown
                on the site, Google may set its own advertising cookies
                as part of that. We don&rsquo;t control what those do;
                see{" "}
                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2"
                >
                  Google&rsquo;s advertising policy
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2>Analytics</h2>
            <p>
              We use Vercel Analytics to see aggregate traffic like page
              views and which pages are popular. It&rsquo;s
              privacy-friendly by design — it doesn&rsquo;t use cookies or
              track you individually across sites.
            </p>
          </section>

          <section>
            <h2>Who we share information with</h2>
            <p>
              We don&rsquo;t sell your data. Information is shared only
              with the services that make the app work, each only
              receiving what it needs to do its job:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — account, saved places, and
                trip history storage.
              </li>
              <li>
                <strong>Google</strong> — if you sign in with Google, or
                if display ads are shown on the site.
              </li>
              <li>
                <strong>Mapbox and OpenStreetMap (Nominatim)</strong> —
                search and address lookup.
              </li>
              <li>
                <strong>Open-Meteo and OpenWeatherMap</strong> — weather
                data.
              </li>
              <li>
                <strong>OpenRouteService and OSRM</strong> — route
                calculation.
              </li>
              <li>
                <strong>Paystack</strong> — Premium subscription payments.
              </li>
              <li>
                <strong>Upstash</strong> — hazard report storage.
              </li>
              <li>
                <strong>Vercel</strong> — hosting and the analytics
                described above.
              </li>
            </ul>
            <p>
              Each of these only sees what&rsquo;s necessary for the
              feature it powers — a search box lookup doesn&rsquo;t reach
              our payment processor, and vice versa.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              You can use the entire app without an account. If you have
              one, you can sign out at any time from your account page.
              To delete your account and the data tied to it, email us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-foreground underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and we&rsquo;ll remove it. Saved places and history kept
              only in your browser (signed-out use) can be cleared any
              time by clearing your browser&rsquo;s site data.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>
              LincolnNavigation.com isn&rsquo;t directed at children under
              13, and we don&rsquo;t knowingly collect information from
              them.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              If this page changes in a meaningful way, we&rsquo;ll update
              the date at the top. Continuing to use the app after a
              change means you&rsquo;re okay with the update.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy or your data — reach us at{" "}
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
      </div>
    </main>
  )
}
