// lib/travel-partners.ts
//
// "Book" links for the travel section. Lincoln Navigation doesn't take
// bookings or payments itself: each link opens a partner's own search page,
// and the partner handles the booking and the payment.
//
// The links work as plain search links straight away. When you have an
// affiliate account with a partner, set its ID in the environment (Vercel →
// Environment Variables, then redeploy) and every link to that partner picks
// it up automatically, so bookings are tracked to you:
//
//   NEXT_PUBLIC_AFFILIATE_BOOKING_AID        Booking.com affiliate id ("aid")
//   NEXT_PUBLIC_AFFILIATE_VIATOR_PID         Viator partner id ("pid")
//   NEXT_PUBLIC_AFFILIATE_GETYOURGUIDE_ID    GetYourGuide partner id ("partner_id")
//
// Nothing is added for a partner whose ID is unset. Partners' own terms tell
// you exactly what parameters they expect — adjust the builders below if a
// programme asks for something different.

export type TravelKind = "stay" | "tour" | "car" | "event"

export interface BookLink {
  id: string
  /** Partner brand — brand names aren't translated. */
  partner: string
  url: string
  /** True when an affiliate id was added to this link. */
  affiliate: boolean
}

const BOOKING_AID = process.env.NEXT_PUBLIC_AFFILIATE_BOOKING_AID?.trim() || ""
const VIATOR_PID = process.env.NEXT_PUBLIC_AFFILIATE_VIATOR_PID?.trim() || ""
const GYG_ID = process.env.NEXT_PUBLIC_AFFILIATE_GETYOURGUIDE_ID?.trim() || ""

/** Which kind of trip a place category leads to, or null if it has no booking. */
export function travelKindFor(category: string | undefined): TravelKind | null {
  switch (category) {
    case "hotel":
      return "stay"
    case "tourism":
    case "tour":
      return "tour"
    case "car_rental":
      return "car"
    case "event_venue":
      return "event"
    default:
      return null
  }
}

const enc = encodeURIComponent

/**
 * Links for one kind of trip. `query` is what to search for: a place name
 * ("Labadi Beach Hotel, Accra") or a general phrase ("Ghana").
 */
export function bookLinks(kind: TravelKind, query: string): BookLink[] {
  const q = enc(query)

  switch (kind) {
    case "stay":
      return [
        {
          id: "booking",
          partner: "Booking.com",
          url: `https://www.booking.com/searchresults.html?ss=${q}${BOOKING_AID ? `&aid=${enc(BOOKING_AID)}` : ""}`,
          affiliate: Boolean(BOOKING_AID),
        },
      ]
    case "tour":
      return [
        {
          id: "viator",
          partner: "Viator",
          url: `https://www.viator.com/searchResults/all?text=${q}${
            VIATOR_PID ? `&pid=${enc(VIATOR_PID)}&mcid=42383&medium=link` : ""
          }`,
          affiliate: Boolean(VIATOR_PID),
        },
        {
          id: "getyourguide",
          partner: "GetYourGuide",
          url: `https://www.getyourguide.com/s/?q=${q}${GYG_ID ? `&partner_id=${enc(GYG_ID)}&utm_medium=online_publisher` : ""}`,
          affiliate: Boolean(GYG_ID),
        },
      ]
    case "car":
      return [
        {
          id: "booking-cars",
          partner: "Booking.com",
          url: `https://www.booking.com/cars/index.html${BOOKING_AID ? `?aid=${enc(BOOKING_AID)}` : ""}`,
          affiliate: Boolean(BOOKING_AID),
        },
      ]
    case "event":
      return [
        {
          id: "eventbrite",
          partner: "Eventbrite",
          url: `https://www.eventbrite.com/d/ghana/${q}/`,
          affiliate: false,
        },
      ]
  }
}

/** True when any link on screen carries an affiliate id (so a disclosure is due). */
export function anyAffiliate(links: BookLink[]): boolean {
  return links.some((l) => l.affiliate)
}
