import Link from "next/link"
import { LegalPage, LegalTable } from "@/components/legal/legal-page"
import {
  DPC_REGISTRATION,
  LEGAL_ADDRESS,
  LEGAL_NAME,
  LEGAL_UPDATED,
  PRIVACY_EMAIL,
  SITE_NAME,
} from "@/lib/legal"

export const metadata = {
  title: "Privacy Policy — Lincoln Navigation",
  description:
    "What LincolnNavigation.com collects, why, who it is shared with, how long it is kept, and your rights under Ghana's Data Protection Act and other laws.",
}

const mail = <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      path="/privacy"
      updated={LEGAL_UPDATED.privacy}
      intro={
        <p>
          This policy explains what {SITE_NAME} (the &ldquo;app&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, why, who it is shared
          with, how long it is kept, and the rights you have over it. It covers
          the website, the installable web app, and every feature in them.
        </p>
      }
    >
      <section>
        <h2>1. The short version</h2>
        <ul>
          <li>You can use the map, search and directions without an account.</li>
          <li>Your location is used on your device; it reaches our servers only to answer a specific request, and is not stored against you unless you save it.</li>
          <li>Hazard reports are anonymous. We never link a report to who sent it.</li>
          <li>We never see your card details. Paystack handles payments.</li>
          <li>We do not sell your personal data.</li>
          <li>You can ask to see, correct or delete your data at any time by emailing {mail}.</li>
        </ul>
      </section>

      <section>
        <h2>2. Who is responsible for your data</h2>
        <p>
          The data controller is <strong>{LEGAL_NAME}</strong>, operator of{" "}
          {SITE_NAME}
          {LEGAL_ADDRESS ? <>, {LEGAL_ADDRESS}</> : null}. Contact for all
          privacy matters: {mail}.
          {DPC_REGISTRATION ? (
            <>
              {" "}We are registered with the Data Protection Commission of
              Ghana under registration number <strong>{DPC_REGISTRATION}</strong>.
            </>
          ) : null}
        </p>
        <p>
          We process personal data in line with Ghana&rsquo;s{" "}
          <strong>Data Protection Act, 2012 (Act 843)</strong>. Where visitors
          from the European Economic Area or the United Kingdom use the app, we
          also apply the rights and principles of the EU and UK General Data
          Protection Regulation (GDPR).
        </p>
      </section>

      <section>
        <h2>3. What we collect and why</h2>
        <LegalTable>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>When</th>
                <th>Why (legal basis)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Email address; name and profile picture if you sign in with Google</td>
                <td>Only if you create an account</td>
                <td>To run your account (contract)</td>
              </tr>
              <tr>
                <td>Saved places, home/work, recent searches</td>
                <td>Signed in: stored on our servers. Signed out: stays in your browser only</td>
                <td>To sync them across your devices (contract)</td>
              </tr>
              <tr>
                <td>Precise device location</td>
                <td>Only after you allow it in your browser</td>
                <td>To show you on the map, route you and warn of nearby hazards (consent; you can withdraw it in browser settings)</td>
              </tr>
              <tr>
                <td>Live position, optional name and destination</td>
                <td>Only while you use &ldquo;Share trip&rdquo;</td>
                <td>To show your trip to the people you send the link to (consent)</td>
              </tr>
              <tr>
                <td>Vehicle name, plate, type; driver&rsquo;s latest position and daily totals</td>
                <td>Only for Pro Fleet accounts, and only while a driver taps &ldquo;Start sharing&rdquo;</td>
                <td>To provide fleet tracking to the business (contract with the business; the driver&rsquo;s consent)</td>
              </tr>
              <tr>
                <td>Hazard type, location, time, optional note</td>
                <td>When you report or vote on a hazard</td>
                <td>To warn other road users (legitimate interest in road safety)</td>
              </tr>
              <tr>
                <td>One photo and approximate location</td>
                <td>Only when you use &ldquo;What is this?&rdquo; and agree to the prompt</td>
                <td>To identify a landmark (consent)</td>
              </tr>
              <tr>
                <td>Billing email, Paystack transaction reference, plan, amount, date</td>
                <td>When you buy Premium or Pro</td>
                <td>To grant the plan, answer billing questions and meet tax and accounting law (contract; legal obligation)</td>
              </tr>
              <tr>
                <td>IP address, browser type, pages requested</td>
                <td>Every visit, as part of normal web traffic</td>
                <td>To deliver the site, stop abuse and keep it secure (legitimate interest)</td>
              </tr>
              <tr>
                <td>What you write to us</td>
                <td>If you email us or use a contact, business or advertising form</td>
                <td>To reply to you (legitimate interest; steps toward a contract)</td>
              </tr>
            </tbody>
          </table>
        </LegalTable>
        <p>
          The contact, business and advertising forms on this site do not send
          anything to our servers: they open your own email app with a message
          ready to send, so we only receive what you choose to send.
        </p>
      </section>

      <section>
        <h2>4. Location in more detail</h2>
        <p>
          Location is the most sensitive thing a map handles, so here is
          exactly what happens. Your browser gives your position to the app on
          your device. A coordinate is sent to our servers only when a feature
          needs it to answer a request: the weather at that spot, the address
          of that spot, places or hazards near it, or a route that starts
          there. Those requests are answered and not stored against you. We
          keep no history of where you have been.
        </p>
        <p>
          With <strong>Share trip</strong>, we keep only your most recent
          position, and delete it when the share ends (you stop it, or the 1,
          4 or 12 hours you chose runs out). Anyone with the link can see your
          position until then, so share it only with people you trust.
          Sharing only reports while the app is open.
        </p>
        <p>
          With <strong>Fleet tools</strong>, a business can see the latest
          position of a vehicle only while its driver has chosen to share.
          We keep that latest position plus running daily totals (distance,
          time moving, top speed), not a route history. Businesses must tell
          their drivers about this and have a lawful basis to track them; see
          our <Link href="/terms">Terms</Link>.
        </p>
      </section>

      <section>
        <h2>5. Hazard reports stay anonymous</h2>
        <p>
          We store the hazard itself (what, where, when, any note) but never
          who reported it. To stop spam and double votes, we turn your
          connection (IP address and browser type) into a one-way scrambled
          code using a secret key. It cannot be turned back into your IP
          address, is never shown with a report, and is deleted within two
          hours, or when the hazard expires for vote records. Your raw IP
          address is not stored. Please don&rsquo;t put personal details,
          names or number plates in hazard notes.
        </p>
      </section>

      <section>
        <h2>6. Who we share data with</h2>
        <p>
          We do not sell or rent personal data. We share only what each
          service needs to power a feature, under its own privacy terms:
        </p>
        <ul>
          <li><strong>Vercel</strong> (hosting, aggregate cookie-free analytics)</li>
          <li><strong>Supabase</strong> (accounts, saved places, trip history, trip shares, fleet data)</li>
          <li><strong>Upstash</strong> (hazard reports and abuse rate limiting)</li>
          <li><strong>Paystack</strong> (payments)</li>
          <li><strong>Google</strong> (Google sign-in if you choose it; place search via Google Places; display ads via AdSense when ads are shown; web fonts)</li>
          <li><strong>Search, address and place data:</strong> Mapbox, OpenStreetMap Nominatim, Overpass API servers, Foursquare, Wikipedia</li>
          <li><strong>Routing:</strong> OpenRouteService (HeiGIT), OSRM, GraphHopper, Valhalla</li>
          <li><strong>Weather and alerts:</strong> Open-Meteo, OpenWeatherMap, GDACS</li>
          <li><strong>Map imagery:</strong> OpenFreeMap, Esri, OpenTopoMap, AWS Terrain Tiles, Mapillary (Street view). Loading map tiles means your browser asks these servers for the area you are viewing.</li>
          <li><strong>Anthropic</strong> (landmark identification, only with your permission)</li>
          <li><strong>WhatsApp</strong>, only if you tap a share-to-WhatsApp button</li>
          <li><strong>Booking.com, Viator, GetYourGuide, Eventbrite</strong>, only if you tap a &ldquo;Book&rdquo; link and leave our site. See our <Link href="/advertising-policy">Advertising &amp; Affiliates</Link> page.</li>
        </ul>
        <p>
          We may also disclose data if Ghanaian or other applicable law
          requires it, to protect people from harm, or as part of a sale or
          reorganisation of the service, in which case this policy continues
          to apply.
        </p>
      </section>

      <section>
        <h2>7. International transfers</h2>
        <p>
          Several of these providers store or process data outside Ghana,
          including in the United States and the European Union. When that
          happens we rely on providers that offer adequate safeguards, such as
          standard contractual clauses, as required by the Data Protection
          Act and the GDPR.
        </p>
      </section>

      <section>
        <h2>8. How long we keep it</h2>
        <ul>
          <li><strong>Account data, saved places, trip history:</strong> until you delete them or your account.</li>
          <li><strong>Trip shares:</strong> deleted when the share ends.</li>
          <li><strong>Fleet data:</strong> until the business deletes the vehicle or its account.</li>
          <li><strong>Hazard reports:</strong> automatically deleted when they expire, between a few hours and 30 days depending on the hazard type (a crash clears sooner than a damaged road).</li>
          <li><strong>Anti-abuse codes and rate-limit counters:</strong> a few minutes to two hours.</li>
          <li><strong>Landmark photos:</strong> not stored; discarded once the answer is returned.</li>
          <li><strong>Payment records:</strong> as long as tax and accounting law requires, then deleted.</li>
          <li><strong>Emails to us:</strong> as long as needed to deal with your request.</li>
        </ul>
      </section>

      <section>
        <h2>9. Your rights</h2>
        <p>Under the Data Protection Act, 2012 (Act 843), and where it applies the GDPR, you can:</p>
        <ul>
          <li>ask whether we hold data about you and get a copy of it;</li>
          <li>have inaccurate data corrected;</li>
          <li>have your data deleted, including your whole account;</li>
          <li>object to processing, or ask us to restrict it;</li>
          <li>withdraw consent at any time (for example, turn off location in your browser), without affecting what was done before;</li>
          <li>receive the data you gave us in a portable format;</li>
          <li>not be subject to decisions made solely by automated means that significantly affect you. We make none.</li>
        </ul>
        <p>
          Email {mail} from the address on your account. We will reply within
          one month and may need to confirm it is you first. There is no
          charge. Data saved while signed out lives only in your browser; you
          can clear it by clearing this site&rsquo;s data.
        </p>
        <p>
          If you are unhappy with how we handle your data, please tell us
          first. You also have the right to complain to the{" "}
          <a href="https://dpc.gov.gh" target="_blank" rel="noopener noreferrer">
            Data Protection Commission of Ghana
          </a>
          , or to the data protection authority where you live.
        </p>
      </section>

      <section>
        <h2>10. Cookies and similar storage</h2>
        <p>
          We use a few essential cookies, browser storage for your settings,
          and, when ads are shown, Google&rsquo;s advertising cookies. The
          full list is in our <Link href="/cookies">Cookie Policy</Link>.
        </p>
      </section>

      <section>
        <h2>11. Security</h2>
        <p>
          Data is encrypted in transit (HTTPS). Account data is protected by
          row-level access rules so each account can only reach its own
          records, and payment and plan cookies are signed to prevent
          tampering. No system is perfectly secure; if we learn of a breach
          that affects your data we will notify you and the Data Protection
          Commission as the law requires. To report a vulnerability, see our{" "}
          <Link href="/security">Security</Link> page.
        </p>
      </section>

      <section>
        <h2>12. Children</h2>
        <p>
          The app is not directed at children under 13, and we do not
          knowingly collect their data. Users under 18 should have a parent
          or guardian&rsquo;s permission, and may not buy a paid plan
          without it. If you believe a child has given us personal data,
          email {mail} and we will delete it.
        </p>
      </section>

      <section>
        <h2>13. Changes to this policy</h2>
        <p>
          We will update the date at the top when this policy changes. If a
          change materially affects how we use your data, we will also tell
          signed-in users by email or in the app before it takes effect.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          Privacy questions and requests: {mail}, or use our{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </section>
    </LegalPage>
  )
}
