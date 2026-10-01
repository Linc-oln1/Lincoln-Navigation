// lib/sponsor-emails.ts  (server only)
//
// Emails about sponsored listings, so nobody has to remember to check
// /admin/sponsors and no advertiser drops off the map without warning:
//
//   paid      → the advertiser ("we're reviewing it") and every ADMIN_EMAILS
//               address ("new listing to review"). From markSponsorPaid.
//   approved / rejected / extended → the advertiser. From the admin route.
//   endingSoon / ended → the advertiser, with their private renew link;
//               pendingDigest → admins. From the daily cron.
//   renewed   → the advertiser and admins, after a renew-link payment.
//
// Each is sent once per event (sendOnce); keys include the end date so a
// renewed listing gets fresh reminders.

import { adminEmails } from "@/lib/admin-auth"
import { emailLayout, escapeHtml, longDate, sendEmail, sendOnce, siteUrl } from "@/lib/email"
import { ADVERTISE_CONTACT_EMAIL, formatSponsorPrice, SPONSOR_DAYS, sponsorPackage } from "@/lib/monetization"
import { renewUrl } from "@/lib/sponsor-link"
import { renewalOffer } from "@/lib/sponsor-renewal"
import { sponsorCategoryLabel } from "@/lib/sponsored-places"
import type { SponsorRow } from "@/lib/sponsor-store"

type Sponsor = Pick<
  SponsorRow,
  | "id"
  | "name"
  | "category"
  | "package"
  | "radius_km"
  | "status"
  | "ends_at"
  | "contact_name"
  | "contact_email"
  | "contact_phone"
  | "paystack_reference"
  | "amount_pesewas"
>

const ADVERTISER_REASON = "You're getting this because you bought a sponsored listing on LincolnNavigation."
const ADMIN_REASON = "You're getting this because your address is in ADMIN_EMAILS for LincolnNavigation."

function firstName(s: Sponsor) {
  return s.contact_name?.trim().split(/\s+/)[0]?.slice(0, 40) || null
}

/** "Gyms", "Car rentals"… (the plural labels used in Explore Nearby). */
function categoryLabel(id: string) {
  return sponsorCategoryLabel(id)
}

function packageLabel(s: Sponsor) {
  const pkg = sponsorPackage(s.package)
  return pkg ? `${pkg.label} (${pkg.radiusKm} km)` : `${Number(s.radius_km)} km`
}

function amount(s: Sponsor) {
  return s.amount_pesewas ? formatSponsorPrice(s.amount_pesewas) : null
}

const b = (text: string) => `<strong>${escapeHtml(text)}</strong>`

/** One email to the advertiser. */
function toAdvertiser(
  s: Sponsor,
  key: string,
  o: { subject: string; emoji: string; heading: string; paragraphs: string[]; text: string[]; button: { label: string; href: string }; note?: string },
) {
  return sendOnce(key, () =>
    sendEmail({
      to: s.contact_email,
      subject: o.subject,
      html: emailLayout({
        preheader: o.text[0],
        emoji: o.emoji,
        heading: o.heading,
        name: firstName(s),
        paragraphs: o.paragraphs,
        button: o.button,
        note: o.note,
        reason: ADVERTISER_REASON,
        siteUrl: siteUrl(),
      }),
      text: [o.heading, "", ...o.text, "", `${o.button.label}: ${o.button.href}`, "", "Thanks,", "The LincolnNavigation Team"].join("\n"),
    }),
  )
}

/** One email to each admin. True if every admin got it (or there are none). */
async function toAdmins(
  key: string,
  o: { subject: string; emoji: string; heading: string; paragraphs: string[]; text: string[] },
) {
  const admin = `${siteUrl()}/admin/sponsors`
  let ok = true
  for (const to of adminEmails()) {
    const sent = await sendOnce(`${key}:${to}`, () =>
      sendEmail({
        to,
        subject: o.subject,
        html: emailLayout({
          preheader: o.text[0],
          emoji: o.emoji,
          heading: o.heading,
          paragraphs: o.paragraphs,
          button: { label: "Review listings", href: admin },
          reason: ADMIN_REASON,
          siteUrl: siteUrl(),
        }),
        text: [o.heading, "", ...o.text, "", `Review: ${admin}`].join("\n"),
      }),
    )
    ok &&= sent
  }
  return ok
}

/** Payment confirmed: thank the advertiser, and tell the admins there's one to review. */
export async function sendListingPaid(s: Sponsor) {
  const paid = amount(s)
  const ref = s.paystack_reference ?? s.id
  const advertiser = await toAdvertiser(s, `sponsor-paid:${s.id}:${ref}`, {
    subject: `We got your payment for ${s.name}`,
    emoji: "🧾",
    heading: "Payment received",
    paragraphs: [
      `Thanks! We got your ${paid ? b(paid) + " " : ""}payment for a ${escapeHtml(packageLabel(s))} sponsored listing for ${b(s.name)} in ${escapeHtml(categoryLabel(s.category))}.`,
      `We review every listing before it goes live. You'll get another email as soon as it's approved, and it runs for ${SPONSOR_DAYS} days from then.`,
    ],
    text: [
      `Thanks! We got your ${paid ? paid + " " : ""}payment for a ${packageLabel(s)} sponsored listing for ${s.name} in ${categoryLabel(s.category)}.`,
      `We review every listing before it goes live. You'll get another email as soon as it's approved.`,
    ],
    button: { label: "Read how listings work", href: `${siteUrl()}/advertising-policy` },
    note: `If we can't approve it, we refund the full amount through Paystack. Need to change a detail? Just reply to this email.`,
  })

  const contact = [s.contact_name, s.contact_email, s.contact_phone].filter(Boolean).join(" · ")
  const admins = await toAdmins(`sponsor-paid-admin:${s.id}:${ref}`, {
    subject: `New sponsored listing to review: ${s.name}`,
    emoji: "📥",
    heading: "New listing to review",
    paragraphs: [
      `${b(s.name)} paid ${paid ? b(paid) : "for a listing"} — ${escapeHtml(packageLabel(s))} in ${escapeHtml(categoryLabel(s.category))}.`,
      `Contact: ${escapeHtml(contact)}`,
      `It isn't on the map until you approve it. If you reject it, refund the payment in the Paystack dashboard${s.paystack_reference ? ` (reference ${escapeHtml(s.paystack_reference)})` : ""}.`,
    ],
    text: [
      `${s.name} paid ${paid ?? "for a listing"} — ${packageLabel(s)} in ${categoryLabel(s.category)}.`,
      `Contact: ${contact}`,
      `Not on the map until you approve it. If you reject it, refund it in Paystack${s.paystack_reference ? ` (reference ${s.paystack_reference})` : ""}.`,
    ],
  })
  return advertiser && admins
}

export function sendListingApproved(s: Sponsor) {
  const ends = s.ends_at ? longDate(new Date(s.ends_at)) : null
  return toAdvertiser(s, `sponsor-live:${s.id}:${s.ends_at}`, {
    subject: `${s.name} is now live on LincolnNavigation`,
    emoji: "🎉",
    heading: "Your listing is live",
    paragraphs: [
      `${b(s.name)} now shows at the top of ${escapeHtml(categoryLabel(s.category))} in Explore Nearby, marked Sponsored, for anyone browsing within ${Number(s.radius_km)} km.`,
      ends ? `It runs until ${b(ends)}. We'll remind you a few days before it ends.` : `We'll remind you a few days before it ends.`,
    ],
    text: [
      `${s.name} now shows at the top of ${categoryLabel(s.category)} in Explore Nearby for anyone browsing within ${Number(s.radius_km)} km.`,
      ends ? `It runs until ${ends}.` : "",
    ],
    button: { label: "See it on the map", href: `${siteUrl()}/app` },
    note: `We count views, listing opens and website taps. Reply any time and we'll send you the numbers.`,
  })
}

export function sendListingRejected(s: Sponsor) {
  const paid = amount(s)
  return toAdvertiser(s, `sponsor-rejected:${s.id}`, {
    subject: `About your listing for ${s.name}`,
    emoji: "📝",
    heading: "We couldn't approve your listing",
    paragraphs: [
      `We reviewed the sponsored listing for ${b(s.name)} and couldn't approve it this time.`,
      `We're refunding the full ${paid ? b(paid) : "amount"} through Paystack to the account or wallet you paid with. It can take a few working days to show up, depending on your bank or wallet.`,
    ],
    text: [
      `We reviewed the sponsored listing for ${s.name} and couldn't approve it this time.`,
      `We're refunding the full ${paid ?? "amount"} through Paystack to the account or wallet you paid with.`,
    ],
    button: { label: "Read our advertising policy", href: `${siteUrl()}/advertising-policy` },
    note: `Want to know why, or send updated details? Just reply to this email.`,
  })
}

export function sendListingExtended(s: Sponsor) {
  const ends = s.ends_at ? longDate(new Date(s.ends_at)) : null
  return toAdvertiser(s, `sponsor-extended:${s.id}:${s.ends_at}`, {
    subject: `${s.name}: your listing has been extended`,
    emoji: "📅",
    heading: "Your listing has been extended",
    paragraphs: [
      ends
        ? `${b(s.name)} stays on the map until ${b(ends)}. Thanks for advertising with us!`
        : `${b(s.name)} stays on the map. Thanks for advertising with us!`,
    ],
    text: [ends ? `${s.name} stays on the map until ${ends}.` : `${s.name} stays on the map.`],
    button: { label: "See it on the map", href: `${siteUrl()}/app` },
  })
}

/**
 * How to keep a listing going: the private renew link for the standard
 * packages (pay, and it's extended straight away with no new review), or a
 * reply for custom deals.
 */
function renewal(s: Sponsor) {
  const offer = renewalOffer({ status: s.status === "ended" ? "ended" : "active", package: s.package })
  return offer.ok
    ? {
        note: `Listings don't renew by themselves. Tap Renew to pay ${formatSponsorPrice(offer.pkg.pricePesewas)} for another ${SPONSOR_DAYS} days on the same listing — it stays live with no new review.`,
        button: { label: "Renew my listing", href: renewUrl(s.id) },
      }
    : {
        note: `Listings don't renew by themselves. Reply to this email and we'll extend it for you.`,
        button: { label: "Email us to renew", href: `mailto:${ADVERTISE_CONTACT_EMAIL}?subject=${encodeURIComponent(`Renew ${s.name}`)}` },
      }
}

export function sendListingEndingSoon(s: Sponsor, daysLeft: number) {
  const ends = s.ends_at ? longDate(new Date(s.ends_at)) : "soon"
  const when = daysLeft <= 1 ? "tomorrow" : `in ${daysLeft} days`
  return toAdvertiser(s, `sponsor-ending:${s.id}:${s.ends_at}`, {
    subject: `Your listing for ${s.name} ends ${when}`,
    emoji: "⏳",
    heading: `Your listing ends ${when}`,
    paragraphs: [`The sponsored listing for ${b(s.name)} comes off the map on ${b(ends)}.`, escapeHtml(renewal(s).note)],
    text: [`The sponsored listing for ${s.name} comes off the map on ${ends}.`, renewal(s).note],
    button: renewal(s).button,
    note: `Questions about advertising? Write to ${ADVERTISE_CONTACT_EMAIL}.`,
  })
}

export function sendListingEnded(s: Sponsor, stats?: { impressions: number; clicks: number; website_clicks: number }) {
  const numbers = stats
    ? `While it ran it was shown ${b(stats.impressions.toLocaleString("en-GB"))} times, opened ${b(stats.clicks.toLocaleString("en-GB"))} times, and its website link was tapped ${b(stats.website_clicks.toLocaleString("en-GB"))} times.`
    : null
  return toAdvertiser(s, `sponsor-ended:${s.id}:${s.ends_at}`, {
    subject: `Your listing for ${s.name} has ended`,
    emoji: "🏁",
    heading: "Your listing has ended",
    paragraphs: [
      `The sponsored listing for ${b(s.name)} is no longer on the map.`,
      ...(numbers ? [numbers] : []),
      escapeHtml(renewal(s).note),
    ],
    text: [
      `The sponsored listing for ${s.name} is no longer on the map.`,
      stats ? `Shown ${stats.impressions} times, opened ${stats.clicks} times, website taps ${stats.website_clicks}.` : "",
      renewal(s).note,
    ],
    button: renewal(s).button,
  })
}

/** A renewal went through: thank the advertiser, and let the admins know (nothing to do). */
export async function sendListingRenewed(s: Sponsor, reference: string) {
  const ends = s.ends_at ? longDate(new Date(s.ends_at)) : null
  const paid = amount(s)
  const advertiser = await toAdvertiser(s, `sponsor-renewed:${s.id}:${reference}`, {
    subject: `${s.name}: your listing has been renewed`,
    emoji: "🔁",
    heading: "Your listing is renewed",
    paragraphs: [
      `Thanks! We got your ${paid ? b(paid) + " " : ""}payment. ${b(s.name)} stays on the map${ends ? ` until ${b(ends)}` : ""} — no new review needed.`,
    ],
    text: [`Thanks! ${s.name} stays on the map${ends ? ` until ${ends}` : ""}.`],
    button: { label: "See it on the map", href: `${siteUrl()}/app` },
    note: `We'll remind you again a few days before it ends.`,
  })
  const admins = await toAdmins(`sponsor-renewed-admin:${reference}`, {
    subject: `${s.name} renewed their listing`,
    emoji: "🔁",
    heading: "A listing was renewed",
    paragraphs: [
      `${b(s.name)} paid ${paid ? b(paid) : "for a renewal"} from their renew link. It's live${ends ? ` until ${b(ends)}` : ""} — nothing for you to do.`,
    ],
    text: [`${s.name} paid ${paid ?? "for a renewal"}. Live${ends ? ` until ${ends}` : ""}; nothing to do.`],
  })
  return advertiser && admins
}

/** Someone paid to renew a listing that can't be extended any more (paused, rejected…). */
export function sendRenewalNeedsAttention(s: Sponsor, reference: string) {
  return toAdmins(`sponsor-renewal-attention:${reference}`, {
    subject: `Renewal payment needs a look: ${s.name}`,
    emoji: "⚠️",
    heading: "Renewal payment needs a look",
    paragraphs: [
      `${b(s.name)} paid to renew (Paystack reference ${escapeHtml(reference)}), but the listing is <strong>${escapeHtml(s.status)}</strong>, so it wasn't extended.`,
      `Extend it in /admin/sponsors, or refund the payment in the Paystack dashboard and let them know.`,
    ],
    text: [`${s.name} paid to renew (ref ${reference}) but the listing is ${s.status}; not extended. Extend it or refund it.`],
  })
}

/** Daily nudge while paid listings are waiting for approval. */
export function sendPendingDigest(pending: Sponsor[], day: string) {
  const names = pending.map((s) => s.name)
  return toAdmins(`sponsor-pending:${day}`, {
    subject: `${pending.length} sponsored listing${pending.length === 1 ? "" : "s"} waiting for review`,
    emoji: "📥",
    heading: `${pending.length} listing${pending.length === 1 ? "" : "s"} waiting`,
    paragraphs: [
      `Paid and waiting for your approval: ${names.map((n) => b(n)).join(", ")}.`,
      `They aren't on the map until you approve them. Anything you reject needs a refund in the Paystack dashboard.`,
    ],
    text: [`Paid and waiting for your approval: ${names.join(", ")}.`],
  })
}
