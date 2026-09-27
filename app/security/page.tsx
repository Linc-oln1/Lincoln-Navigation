import { LegalPage } from "@/components/legal/legal-page"
import { LEGAL_UPDATED, SECURITY_EMAIL } from "@/lib/legal"

export const metadata = {
  title: "Security — Lincoln Navigation",
  description: "How to report a security vulnerability in LincolnNavigation.com.",
}

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      path="/security"
      updated={LEGAL_UPDATED.security}
      intro={
        <p>
          If you have found a security problem, thank you. Please tell us
          privately so we can fix it before anyone is harmed.
        </p>
      }
    >
      <section>
        <h2>How to report</h2>
        <p>
          Email <a href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a> with
          &ldquo;Security&rdquo; in the subject, what you found, and the steps
          to reproduce it. We will reply within 5 working days and keep you
          updated until it is fixed.
        </p>
      </section>

      <section>
        <h2>Please</h2>
        <ul>
          <li>only test against your own account and data;</li>
          <li>do not access, change or delete other people&rsquo;s data, or keep any you come across;</li>
          <li>do not run denial-of-service, spam or social-engineering tests;</li>
          <li>give us reasonable time to fix the issue before telling anyone else.</li>
        </ul>
        <p>
          If you follow these guidelines in good faith, we will not take
          legal action against you over your research, and we will credit
          you if you would like.
        </p>
      </section>
    </LegalPage>
  )
}
