import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal"

export const metadata = {
  title: "Refund Policy — Lincoln Navigation",
  description:
    "When you can get your money back for Premium or Pro on LincolnNavigation.com, and how to ask.",
}

// Refund windows, in one place so the page and any future code agree.
const CHANGE_OF_MIND_HOURS = 48
const FAULT_DAYS = 7

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund Policy"
      path="/refunds"
      updated={LEGAL_UPDATED.refunds}
      intro={
        <>
        <p>
          Premium and Pro can be a monthly card subscription, which you can
          cancel at any time on your account page, or a one-off payment for
          31 days that doesn&rsquo;t renew. Here is when you can get your
          money back.
        </p>
        <p>
          This page covers Premium and Pro. Refunds for sponsored listings
          bought on the Advertise page are covered by our{" "}
          <Link href="/advertising-policy">Advertising policy</Link>.
        </p>
        </>
      }
    >
      <section>
        <h2>1. You will get a full refund if</h2>
        <ul>
          <li><strong>You were charged twice</strong> for the same purchase, or charged but your plan never activated and we cannot fix it.</li>
          <li><strong>You change your mind</strong> within {CHANGE_OF_MIND_HOURS} hours of paying, including a monthly renewal you forgot to cancel. This applies once per customer.</li>
          <li><strong>A paid feature does not work as described</strong> and we cannot fix it within a reasonable time, if you tell us within {FAULT_DAYS} days of paying.</li>
          <li><strong>We close your account or remove a paid feature</strong> without fault on your part; you get the unused part of your plan back.</li>
        </ul>
      </section>

      <section>
        <h2>2. When refunds are not given</h2>
        <ul>
          <li>After the windows above, for a plan that worked as described.</li>
          <li>For the rest of a month you have already paid for when you cancel. Cancelling stops the next charge; your plan stays active until that month ends.</li>
          <li>For the unused days of a one-off 31-day payment you simply stopped using.</li>
          <li>If your account was suspended for breaking our <Link href="/terms">Terms</Link>.</li>
          <li>For bookings made on partner sites (Booking.com, Viator, GetYourGuide, Eventbrite and others). Those are between you and the partner; ask them directly.</li>
        </ul>
        <p>
          None of this limits any right to a refund or remedy you have under
          consumer protection law.
        </p>
      </section>

      <section>
        <h2>3. How to ask</h2>
        <p>
          Email {mail} from the address you paid with. Include the Paystack
          transaction reference (it is in your Paystack receipt email) and a
          line on why. We reply within 3 working days.
        </p>
      </section>

      <section>
        <h2>4. How you are paid back</h2>
        <p>
          Approved refunds go back through Paystack to the card, bank account
          or mobile money wallet you paid with. They usually arrive within 10
          working days, depending on your bank or provider. The plan ends when
          a full refund is made.
        </p>
      </section>

      <section>
        <h2>5. Disputes and chargebacks</h2>
        <p>
          Please contact us before opening a dispute with your bank or mobile
          money provider; we can usually sort it out faster. If a chargeback
          is made, the plan it paid for is ended.
        </p>
      </section>
    </LegalPage>
  )
}
