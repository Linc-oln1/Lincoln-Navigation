import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal"
import { SPONSOR_DAYS } from "@/lib/monetization"

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
        <h3>Buying a sponsored listing online</h3>
        <ul>
          <li>You can buy a sponsored listing on the <Link href="/advertise">Advertise</Link> page. The package, price and area it covers are shown before you pay, and you pay once through Paystack.</li>
          <li>One payment covers one listing in one category for {SPONSOR_DAYS} days, counted from the day it goes live. It does <strong>not</strong> renew automatically; to keep it running, pay again or ask us to extend it. Before a listing ends we email you a private renew link; paying through it adds {SPONSOR_DAYS} days to the same listing straight away, with no new review.</li>
          <li><strong>Every listing is reviewed before it goes live.</strong> Paying does not guarantee approval. We may ask you to change the name, promo line, link or location so it is accurate and follows this policy.</li>
          <li><strong>If we don&rsquo;t approve your listing, we refund the full amount</strong> through Paystack to the account or wallet you paid with.</li>
          <li>You are responsible for the details you give us. If the location you pick is wrong, tell us and we will correct it.</li>
        </ul>
        <h3>Other advertising</h3>
        <p>
          Display ads, featured partnerships and other placements are agreed
          in writing (email is fine) with the price, dates and content.
        </p>
        <h3>Your responsibilities</h3>
        <p>
          By advertising with us, online or otherwise, you confirm that your
          ad is truthful, that you have the rights to everything in it, and
          that it complies with the laws of Ghana, including consumer
          protection and advertising standards.
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
          We count views, listing opens and website taps in good faith and
          share them with you, but we do not guarantee a particular number of
          views, clicks or sales.
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
