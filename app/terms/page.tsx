import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { CONTACT_EMAIL, LEGAL_NAME, LEGAL_UPDATED, SITE_NAME } from "@/lib/legal"

export const metadata = {
  title: "Terms of Service — Lincoln Navigation",
  description:
    "The agreement for using LincolnNavigation.com: accounts, paid plans, hazard reports, fleet tools, safe driving, and liability.",
}

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      path="/terms"
      updated={LEGAL_UPDATED.terms}
      intro={
        <p>
          These terms are an agreement between you and{" "}
          <strong>{LEGAL_NAME}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;),
          operator of {SITE_NAME} (the &ldquo;app&rdquo;). By using the app
          you agree to them, and to our <Link href="/privacy">Privacy Policy</Link>,{" "}
          <Link href="/cookies">Cookie Policy</Link> and, if you buy a plan,
          our <Link href="/refunds">Refund Policy</Link>. If you do not agree,
          please do not use the app.
        </p>
      }
    >
      <section>
        <h2>1. Safety first: read this before you drive</h2>
        <p>
          <strong>
            The app is a guide, not a guarantee. You are always responsible
            for how you drive, ride or walk.
          </strong>
        </p>
        <ul>
          <li>Obey the Road Traffic Act, road signs, signals, police directions and actual road conditions, even when the app says otherwise.</li>
          <li>Do not handle your phone while driving. Set your route before you move, use voice guidance, and mount your phone hands-free, or let a passenger operate it.</li>
          <li>Routes may use roads that are closed, unpaved, flooded, unsafe, private, or unsuitable for your vehicle. Truck and vehicle settings are estimates; check height, weight and access restrictions yourself.</li>
          <li>Hazard reports, traffic, weather and arrival times can be wrong, late or missing. The absence of a warning does not mean a road is safe.</li>
          <li>Never use the app as your only tool in an emergency. Call 112 or the relevant emergency service.</li>
        </ul>
      </section>

      <section>
        <h2>2. Who can use the app</h2>
        <p>
          The core app (map, search, directions, weather, hazard viewing) is
          free and needs no account. You must be at least 13 to use it. If you
          are under 18, you need a parent or guardian&rsquo;s permission, and
          they must agree to these terms and make any purchase for you.
        </p>
      </section>

      <section>
        <h2>3. Your account</h2>
        <p>
          Keep your email and sign-in methods secure; you are responsible for
          activity on your account. Tell us promptly at {mail} if you think
          someone else has used it. You may close your account at any time
          (see the <Link href="/privacy">Privacy Policy</Link>).
        </p>
      </section>

      <section>
        <h2>4. Paid plans (Premium and Pro)</h2>
        <ul>
          <li><strong>Price.</strong> Current prices and features are shown on the <Link href="/pricing">pricing page</Link> in Ghana cedis (GHS), including any taxes that apply. The price you see at checkout is the price you pay.</li>
          <li><strong>Term.</strong> Each payment unlocks the plan for 31 days from the date of payment.</li>
          <li><strong>No automatic renewal.</strong> We do not store your card or charge you again. When a plan lapses it simply ends; to continue, you pay again.</li>
          <li><strong>Payment.</strong> Payments are processed by Paystack under its own terms. We never see your card details.</li>
          <li><strong>Per-device access.</strong> A plan is linked to the billing email you enter. You can restore it on another device from your account page using that email.</li>
          <li><strong>Refunds.</strong> See our <Link href="/refunds">Refund Policy</Link>. Nothing in these terms limits refund rights you have under consumer protection law.</li>
          <li><strong>Changes.</strong> We may change prices or features for future purchases. A change never affects a plan you have already paid for. If we introduce automatic renewal, we will ask for your clear agreement before charging you.</li>
        </ul>
      </section>

      <section>
        <h2>5. Fleet tools (Pro) for businesses</h2>
        <p>If you use Fleet tools to see the location of vehicles or drivers, you agree that:</p>
        <ul>
          <li>you will only track vehicles you own or are authorised to manage, and only for legitimate business purposes;</li>
          <li>you will tell each driver, before they share, what is collected, why, and who can see it, and have a lawful basis to process it under the Data Protection Act, 2012 (Act 843) and employment law;</li>
          <li>you will not use Fleet tools to track anyone covertly, or anyone outside working time without their agreement;</li>
          <li>for fleet data, you are the data controller and we process it on your behalf, only to provide the service.</li>
        </ul>
        <p>Drivers can stop sharing at any time from the link they were sent.</p>
      </section>

      <section>
        <h2>6. Sharing your trip</h2>
        <p>
          Anyone who has a trip-share link can see your live position until
          the share ends. Share links only with people you trust. You must not
          share someone else&rsquo;s location without their permission.
        </p>
      </section>

      <section>
        <h2>7. Content you submit</h2>
        <p>
          Hazard reports, notes, votes and anything else you submit remain
          yours, but you give us a worldwide, royalty-free, non-exclusive
          licence to store, display, adapt and share it for running and
          improving the app, for as long as it is relevant. You confirm it is
          honest and that you have the right to submit it.
        </p>
        <p>
          Reports are made by users, not verified by us, and are shown as-is.
          We may edit, hide or remove any content at our discretion,
          especially if it looks false, abusive or dangerous.
        </p>
      </section>

      <section>
        <h2>8. Landmark identification (Premium)</h2>
        <p>
          &ldquo;What is this?&rdquo; uses an AI model to guess what is in your
          photo. Answers may be wrong and are for general interest only. Do
          not photograph people without their consent, or anything you are
          not allowed to photograph, such as military or security sites.
        </p>
      </section>

      <section>
        <h2>9. Acceptable use</h2>
        <p>You must not:</p>
        <ul>
          <li>break any law, or use the app to plan or commit a crime, including evading a lawful police checkpoint;</li>
          <li>submit false, misleading, abusive or spam hazard reports, or post personal details, names or number plates of others;</li>
          <li>stalk, harass or track anyone without their consent;</li>
          <li>get around rate limits, plan checks, or any security or access control;</li>
          <li>scrape, copy, resell or bulk-download the app&rsquo;s data, or reverse-engineer it, except as the open data licences allow;</li>
          <li>overload, disrupt, or introduce malicious code into the app.</li>
        </ul>
      </section>

      <section>
        <h2>10. Map data, third parties and links</h2>
        <p>
          Map data, search results, routes, weather and imagery come partly
          from third parties, including OpenStreetMap contributors, under
          their own licences (see <Link href="/attributions">Map Data &amp; Attributions</Link>).
          We do not control their accuracy. Links and &ldquo;Book&rdquo;
          buttons take you to other sites whose own terms apply; we are not
          responsible for their content, products or services. Some links and
          places are sponsored or earn us a commission; see{" "}
          <Link href="/advertising-policy">Advertising &amp; Affiliates</Link>.
        </p>
      </section>

      <section>
        <h2>11. Our intellectual property</h2>
        <p>
          The {SITE_NAME} name, logo, design and software belong to us or our
          licensors. We give you a personal, non-exclusive, non-transferable
          right to use the app for its intended purpose under these terms.
          Open data and open-source components remain under their own
          licences.
        </p>
      </section>

      <section>
        <h2>12. Availability and changes to the app</h2>
        <p>
          We may add, change or remove features, and the app may sometimes be
          unavailable for maintenance or reasons outside our control. If we
          remove a paid feature during a plan you have paid for, we will
          refund the unused part.
        </p>
      </section>

      <section>
        <h2>13. Disclaimer</h2>
        <p>
          To the fullest extent the law allows, the app is provided &ldquo;as
          is&rdquo; and &ldquo;as available&rdquo;, without warranties of any
          kind, including accuracy of maps, routes, arrival times, hazards,
          weather, place details, opening hours or prices, fitness for a
          particular purpose, or uninterrupted service.
        </p>
      </section>

      <section>
        <h2>14. Limitation of liability</h2>
        <p>
          To the fullest extent the law allows, we are not liable for
          indirect, incidental, special or consequential loss, or for loss of
          profit, time, data or goodwill, arising from use of the app,
          including reliance on routes, hazard reports, weather or other data.
          Our total liability to you for any claim is limited to the greater
          of the amount you paid us in the 3 months before the claim, or
          GHS 100.
        </p>
        <p>
          Nothing in these terms excludes or limits liability for death or
          personal injury caused by our negligence, for fraud, or any other
          liability that cannot be limited under the law of Ghana, including
          your rights as a consumer.
        </p>
      </section>

      <section>
        <h2>15. Indemnity</h2>
        <p>
          If you break these terms or the law (for example, by submitting a
          false report or tracking someone unlawfully with Fleet tools) and a
          claim is made against us as a result, you agree to cover our
          reasonable losses and costs from that claim.
        </p>
      </section>

      <section>
        <h2>16. Suspension and ending</h2>
        <p>
          You can stop using the app at any time. We may suspend or close an
          account, or block access, if you seriously or repeatedly break
          these terms, or if the law requires it. Where we do so without your
          fault, we will refund any unused part of a paid plan. Sections that
          by nature should survive (such as 7, 13, 14, 15 and 17) continue
          after these terms end.
        </p>
      </section>

      <section>
        <h2>17. Governing law and disputes</h2>
        <p>
          These terms are governed by the laws of the Republic of Ghana.
          Please contact us first at {mail}; most concerns can be settled
          quickly. If we cannot resolve a dispute within 30 days, either of
          us may refer it to mediation under the Alternative Dispute
          Resolution Act, 2010 (Act 798), or to the courts of Ghana. If you
          live elsewhere as a consumer, you keep any protections and right to
          sue at home that your local law gives you.
        </p>
      </section>

      <section>
        <h2>18. General</h2>
        <ul>
          <li>If any part of these terms is found unenforceable, the rest stays in force.</li>
          <li>If we do not enforce a right straight away, we have not given it up.</li>
          <li>You may not transfer your rights under these terms; we may transfer ours to a business that takes over the app, and your rights will not be reduced.</li>
          <li>These terms, with the policies they link to, are the whole agreement between us about the app.</li>
          <li>If we translate these terms, the English version prevails.</li>
        </ul>
      </section>

      <section>
        <h2>19. Changes to these terms</h2>
        <p>
          We may update these terms. We will change the date at the top, and
          for significant changes tell signed-in users in advance by email or
          in the app. If you keep using the app after a change takes effect,
          the new terms apply; if you do not agree, you can stop using it and
          close your account.
        </p>
      </section>

      <section>
        <h2>20. Contact</h2>
        <p>
          {mail} or our <Link href="/contact">contact page</Link>.
        </p>
      </section>
    </LegalPage>
  )
}
