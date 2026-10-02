import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { pageMeta } from "@/lib/page-meta"
import { LEGAL_UPDATED, PRIVACY_EMAIL, SITE_NAME } from "@/lib/legal"

// Public account-deletion page. Google Play requires a web link where people
// can ask for deletion without reinstalling the app; the button itself lives
// on /account (components/site/account-delete.tsx).

export const metadata = pageMeta({
  title: "Delete Your Account — Lincoln Navigation",
  description:
    "How to permanently delete your Lincoln Navigation account and what data is removed or kept.",
  path: "/delete-account",
})

const mail = <a href={`mailto:${PRIVACY_EMAIL}?subject=Delete%20my%20account`}>{PRIVACY_EMAIL}</a>

export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Delete your account"
      path="/delete-account"
      updated={LEGAL_UPDATED.deleteAccount}
      intro={
        <p>
          You can permanently delete your {SITE_NAME} account at any time, from
          the website or from the Lincoln Navigation app on Android or iPhone.
        </p>
      }
    >
      <section>
        <h2>How to delete it</h2>
        <ol>
          <li>
            Sign in and open your <Link href="/account">Account</Link> page (in the
            app: menu → Account).
          </li>
          <li>At the bottom, choose <strong>Delete my account</strong>.</li>
          <li>Type DELETE and confirm. Deletion happens straight away.</li>
        </ol>
        <p>
          Can&rsquo;t sign in? Email {mail} from the address on the account and
          we&rsquo;ll delete it within 30 days.
        </p>
      </section>

      <section>
        <h2>What is deleted</h2>
        <ul>
          <li>Your sign-in (email, password, linked Google account) and profile</li>
          <li>Saved places and recent searches</li>
          <li>Fleet vehicles and their trip statistics</li>
          <li>Any plan that renews monthly is stopped, so you are not charged again</li>
        </ul>
      </section>

      <section>
        <h2>What is kept</h2>
        <ul>
          <li>
            Payment receipts (amount, date, Paystack reference), without your
            account attached, for as long as Ghana&rsquo;s tax laws require.
          </li>
          <li>
            Anonymous road-hazard reports you posted, which never carried your
            account, until they expire from the map.
          </li>
        </ul>
        <p>
          See the <Link href="/privacy">Privacy Policy</Link> for everything we
          collect and how long it is kept.
        </p>
      </section>
    </LegalPage>
  )
}
