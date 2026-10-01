// /advertise/renew?l=<sponsor id>&t=<signature>
//
// The private "Renew my listing" page linked from our sponsor emails. Shows
// the listing and when it ends; paying (RenewButton → /api/sponsor/renew →
// Paystack) adds SPONSOR_DAYS to the same listing with no new review.
// Paystack's return lands back here with ?paid=1 or ?error=….

import type { Metadata } from "next"
import Link from "next/link"
import { CalendarClock, CheckCircle2, MapPin } from "lucide-react"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { RenewButton } from "@/components/sponsor/renew-button"
import { ADVERTISE_CONTACT_EMAIL, formatSponsorPrice, SPONSOR_DAYS } from "@/lib/monetization"
import { isValidRenewToken } from "@/lib/sponsor-link"
import { renewalOffer, renewedEndsAt } from "@/lib/sponsor-renewal"
import { sponsorCategoryLabel } from "@/lib/sponsored-places"
import { getSponsor } from "@/lib/sponsor-store"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Renew your listing — Lincoln Navigation",
  robots: { index: false, follow: false },
}

const RETURN_ERRORS: Record<string, string> = {
  "payment-not-confirmed": "We couldn’t confirm that payment. If you were charged, email us and we’ll sort it out.",
  "payment-not-a-listing": "That payment didn’t match this listing. Email us and we’ll sort it out.",
  "payment-not-recorded": "Your payment went through but we couldn’t record it yet. We’ll extend it by hand — email us if it isn’t updated soon.",
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" })
}

export default async function RenewPage({
  searchParams,
}: {
  searchParams: Promise<{ l?: string; t?: string; paid?: string; error?: string }>
}) {
  const { l = "", t = "", paid, error } = await searchParams
  const sponsor = isValidRenewToken(l, t) ? await getSponsor(l) : null
  const offer = sponsor ? renewalOffer(sponsor) : null
  const now = Date.now()
  const live = sponsor?.status === "active" && (!sponsor.ends_at || Date.parse(sponsor.ends_at) > now)
  const mail = (
    <a href={`mailto:${ADVERTISE_CONTACT_EMAIL}`} className="font-semibold text-primary hover:underline">
      {ADVERTISE_CONTACT_EMAIL}
    </a>
  )

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight sm:text-4xl">Renew your listing</h1>

        {!sponsor ? (
          <p className="mt-4 text-muted-foreground">
            This renew link isn&rsquo;t valid. Use the link in our most recent email, or write to {mail}.
          </p>
        ) : (
          <>
            {paid === "1" && (
              <p className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                <span>
                  Thank you — your listing is renewed
                  {sponsor.ends_at ? <> and runs until <strong>{fmt(sponsor.ends_at)}</strong></> : null}. We&rsquo;ve
                  emailed you a receipt.
                </span>
              </p>
            )}
            {error && RETURN_ERRORS[error] && (
              <p className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
                {RETURN_ERRORS[error]} {mail}
              </p>
            )}

            <section className="mt-6 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">{sponsor.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sponsorCategoryLabel(sponsor.category)} · {offer?.ok ? offer.pkg.label : "Custom"} ·{" "}
                {sponsor.radius_km} km around your business
              </p>
              <p className="mt-3 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                {sponsor.address}
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm">
                <CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                {live
                  ? sponsor.ends_at
                    ? <>Live until <strong>{fmt(sponsor.ends_at)}</strong></>
                    : <>Live, with no end date</>
                  : sponsor.ends_at
                    ? <>Ended on <strong>{fmt(sponsor.ends_at)}</strong></>
                    : <>Not live right now</>}
              </p>
            </section>

            {offer?.ok ? (
              <section className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Renewing adds {SPONSOR_DAYS} days to the same listing
                  {live ? " after its current end date" : ", starting today"}, so it runs until{" "}
                  <strong className="text-foreground">{fmt(renewedEndsAt(sponsor.ends_at))}</strong>. It&rsquo;s
                  already approved, so it stays live with no new review.
                </p>
                <RenewButton id={l} token={t} label={`Pay ${formatSponsorPrice(offer.pkg.pricePesewas)} with Paystack`} />
                <p className="text-xs text-muted-foreground">
                  Mobile money and cards via Paystack. One payment, no automatic renewal. By paying you agree to our{" "}
                  <Link href="/advertising-policy" className="underline">advertising policy</Link>.
                </p>
              </section>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                {offer?.reason === "custom"
                  ? "This is a custom listing, so we renew it for you."
                  : "This listing can’t be renewed online right now."}{" "}
                Write to {mail}{" "}and we&rsquo;ll sort it out.
              </p>
            )}

            <p className="mt-10 text-sm text-muted-foreground">
              Want to change the name, promo line, link or location? Reply to any of our emails or write to {mail}.
            </p>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  )
}
