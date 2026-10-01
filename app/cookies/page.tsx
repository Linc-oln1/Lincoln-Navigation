import Link from "next/link"
import { LegalPage, LegalTable } from "@/components/legal/legal-page"
import { LEGAL_UPDATED, PRIVACY_EMAIL } from "@/lib/legal"

export const metadata = {
  title: "Cookie Policy — Lincoln Navigation",
  description:
    "Every cookie and piece of browser storage LincolnNavigation.com uses, what it is for, and how to control it.",
}

type Row = { name: string; purpose: string; kept: string }

const COOKIES: Row[] = [
  { name: "sb-…-auth-token", purpose: "Keeps you signed in (set by our login provider, Supabase). Only if you sign in.", kept: "Until you sign out, refreshed while you use the app" },
  { name: "ln_premium", purpose: "Signed proof that you have an active Premium or Pro plan. Only if you buy one.", kept: "Until the end of the month you paid for; refreshed when your plan renews" },
]

const STORAGE: Row[] = [
  { name: "lincoln-nav:saved-places", purpose: "Your saved places when signed out", kept: "Until you delete them" },
  { name: "lincoln-nav:recent-searches", purpose: "Your recent searches when signed out", kept: "Until you clear them" },
  { name: "ln_lang", purpose: "Your chosen language", kept: "Until changed" },
  { name: "ln_route_prefs, ln_truck_prefs", purpose: "Route options (avoid tolls, vehicle size and so on)", kept: "Until changed" },
  { name: "ln_trip_share, ln_trip_share_name", purpose: "Your active trip share and the name you show on it", kept: "Until the share ends / until changed" },
  { name: "ln_offline_regions", purpose: "The list of map areas you saved for offline use", kept: "Until you delete them" },
  { name: "ln_identify_consent", purpose: "Remembers that you agreed to send photos for landmark identification", kept: "Until you clear site data" },
  { name: "ln_expiry_dismissed", purpose: "Hides the plan-expiry reminder after you close it", kept: "Until the next plan" },
  { name: "Cache storage (service worker)", purpose: "Lets the app load quickly and keeps offline map areas available", kept: "Until you delete offline areas or clear site data" },
]

function Rows({ rows }: { rows: Row[] }) {
  return (
    <LegalTable>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>How long</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td><code className="text-xs text-foreground">{r.name}</code></td>
              <td>{r.purpose}</td>
              <td>{r.kept}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LegalTable>
  )
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      path="/cookies"
      updated={LEGAL_UPDATED.cookies}
      intro={
        <p>
          Cookies and browser storage are small pieces of data a website
          keeps on your device. We use very few, and none of ours track you
          across other websites. This page lists them all.
        </p>
      }
    >
      <section>
        <h2>1. Essential cookies</h2>
        <p>
          These make features you ask for work, so they do not need consent.
          The app does not set them unless you use the feature.
        </p>
        <Rows rows={COOKIES} />
      </section>

      <section>
        <h2>2. Settings kept in your browser</h2>
        <p>
          These stay on your device and are never sent to us automatically.
          They remember your choices so you don&rsquo;t have to repeat them.
        </p>
        <Rows rows={STORAGE} />
      </section>

      <section>
        <h2>3. Analytics</h2>
        <p>
          We use Vercel Analytics to count page views. It uses no cookies,
          does not identify you, and does not follow you to other sites.
        </p>
      </section>

      <section>
        <h2>4. Advertising cookies (Google)</h2>
        <p>
          When display ads are shown, Google may set cookies to show ads,
          limit how often you see the same ad, measure results, and, where
          you allow it, personalise ads based on your interests. Where the law
          requires your consent (for example in the European Economic Area,
          the UK and Switzerland), Google asks for it before using these
          cookies for personalised ads. Paid plans remove ads.
        </p>
        <p>
          You can control Google&rsquo;s ad personalisation at{" "}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
            Google Ad Settings
          </a>{" "}
          and read how Google uses data from partner sites at{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            policies.google.com
          </a>
          . You can also opt out of many ad networks at{" "}
          <a href="https://www.youronlinechoices.eu" target="_blank" rel="noopener noreferrer">
            youronlinechoices.eu
          </a>{" "}
          or{" "}
          <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer">
            aboutads.info
          </a>
          .
        </p>
      </section>

      <section>
        <h2>5. Other sites</h2>
        <p>
          Map tiles, Street view images and web fonts load from the providers
          listed in our <Link href="/privacy">Privacy Policy</Link>. When you
          follow a &ldquo;Book&rdquo; link or pay through Paystack, you are on
          their site and their cookie policies apply.
        </p>
      </section>

      <section>
        <h2>6. How to control cookies</h2>
        <p>
          You can block or delete cookies and site data in your browser
          settings. Deleting this site&rsquo;s data signs you out, removes
          saved places kept while signed out, and removes offline maps.
          Blocking essential cookies stops sign-in and paid plans from
          working; everything else still works.
        </p>
        <p>Questions: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  )
}
