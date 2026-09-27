import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal"

export const metadata = {
  title: "Advertising & Affiliates — Lincoln Navigation",
  description:
    "How LincolnNavigation.com labels ads and sponsored places, earns affiliate commission, and what advertisers may and may not promote.",
}

export default function AdvertisingPolicyPage() {
  return (
    <LegalPage
      title="Advertising & Affiliates"
      path="/advertising-policy"
      updated={LEGAL_UPDATED.advertising}
      intro={
        <p>
          Ads, sponsorships and booking commissions keep the core map free.
          This page explains how we keep them honest and clearly labelled.
        </p>
      }
    >
      <section>
        <h2>1. For people using the map</h2>
        <ul>
          <li><strong>Sponsored places</strong> are always labelled &ldquo;Sponsored&rdquo;. A business pays to appear at the top of a category; payment never changes routes, hazard warnings, or other places&rsquo; details.</li>
          <li><strong>Display ads</strong> are served by Google AdSense and marked as ads. Premium and Pro remove them.</li>
          <li><strong>Booking links.</strong> When you tap &ldquo;Book&rdquo; and buy something from a partner such as Booking.com, Viator, GetYourGuide or Eventbrite, we may earn a commission. It costs you nothing extra, and the partner&rsquo;s own terms and prices apply.</li>
          <li>We never share your personal data with advertisers. See our <Link href="/privacy">Privacy Policy</Link> and <Link href="/cookies">Cookie Policy</Link>.</li>
        </ul>
      </section>

      <section>
        <h2>2. For advertisers</h2>
        <p>
          Placements are agreed in writing (email is fine) with the price,
          dates and content. By advertising with us you confirm that your ad
          is truthful, that you have the rights to everything in it, and that
          it complies with the laws of Ghana, including consumer protection
          and advertising standards.
        </p>
        <h3>We do not accept ads for</h3>
        <ul>
          <li>anything illegal in Ghana, including unlicensed betting, lending or financial schemes;</li>
          <li>weapons, illegal drugs, or tobacco and vaping products;</li>
          <li>adult or sexual content;</li>
          <li>misleading health claims, &ldquo;get rich quick&rdquo; offers or pyramid schemes;</li>
          <li>content that is hateful, discriminatory or politically divisive;</li>
          <li>anything that encourages unsafe driving or evading police checkpoints.</li>
        </ul>
        <p>
          Alcohol ads must follow the Food and Drugs Authority&rsquo;s
          guidelines and must never be linked to driving. We may refuse or
          remove any ad at our discretion; if we remove one that followed
          these rules, we refund the unused part.
        </p>
        <p>
          We report impressions and clicks in good faith but do not guarantee
          a particular number of views, clicks or sales.
        </p>
      </section>

      <section>
        <h2>3. Contact</h2>
        <p>
          To advertise, see <Link href="/advertise">Advertise</Link>. To report
          an ad, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  )
}
