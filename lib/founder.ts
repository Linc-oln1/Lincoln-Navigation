// lib/founder.ts
//
// The founder's public profile: shown on /about and /about/jonathan-kwaku-abra,
// and in the structured data that tells search engines who founded and runs
// Lincoln Navigation (lib/structured-data.ts). Public details only — contact
// goes through the site's own address, not a personal email or phone.

import { SITE_BASE } from "@/lib/site-base"

export const COMPANY_LEGAL_NAME = "Jonathan Lincoln Enterprise"
export const FOUNDING_YEAR = "2026"
export const FOUNDING_PLACE = "Seoul, South Korea"

export const FOUNDER = {
  name: "Jonathan Kwaku Abra",
  /** Shown after the name: "Jonathan Kwaku Abra (Lincoln)". */
  knownAs: "Lincoln",
  alternateNames: ["Lincoln", "Jonathan Lincoln"],
  title: "Founder & CEO",
  path: "/about/jonathan-kwaku-abra",
  photo: "/team/jonathan-kwaku-abra.webp",
  photoSquare: "/team/jonathan-kwaku-abra-square.jpg",
  profiles: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/jonathan-kwaku-abra/" },
    { label: "X", href: "https://x.com/lincoln__jnr" },
    { label: "Instagram", href: "https://www.instagram.com/lincoln__jnr/" },
  ],
  summary:
    "Jonathan Kwaku Abra (Lincoln) is the Founder and CEO of Lincoln Navigation, the maps and navigation platform built for Ghana, and of Jonathan Lincoln Enterprise, the navigation and location technology company behind it.",
  bio: [
    "Jonathan is a technology entrepreneur with a background in Information Technology Management, software development and business operations. Years of running business operations gave Jonathan a close understanding of customer needs, business strategy, technology implementation and growth — experience now put to work solving real-world problems through technology.",
    "Jonathan founded Lincoln Navigation in 2026 with a clear vision: a navigation platform designed around the realities of African cities, roads, communities and transport, beginning with Ghana. The platform aims to bring digital maps, turn-by-turn navigation, real-time traffic information, location services, route optimisation, satellite and street-level mapping, offline navigation and local business discovery together in one ecosystem.",
    "The long-term vision goes beyond navigation: Lincoln Navigation as African location-technology infrastructure that supports mobility, logistics, tourism, transportation, emergency services, businesses and digital commerce across the continent.",
    "As CEO, Jonathan leads the company's product vision, technology strategy, partnerships, business development, branding and expansion — with the goal of building LincolnNavigation.com into a globally recognised African technology company whose products make movement, discovery and connectivity easier for millions of people.",
  ],
  vision: "Build world-class location technology from Africa, for Africa — and eventually for the world.",
  expertise: ["Navigation and location technology", "Digital mapping", "Software development", "Information Technology Management", "Business operations"],
}

export const FOUNDER_ID = `${SITE_BASE}${FOUNDER.path}#person`

/** schema.org Person for the founder. */
export function founderPerson() {
  return {
    "@type": "Person",
    "@id": FOUNDER_ID,
    name: FOUNDER.name,
    alternateName: FOUNDER.alternateNames,
    jobTitle: FOUNDER.title,
    description: FOUNDER.summary,
    url: `${SITE_BASE}${FOUNDER.path}`,
    image: `${SITE_BASE}${FOUNDER.photoSquare}`,
    sameAs: FOUNDER.profiles.map((p) => p.href),
    knowsAbout: FOUNDER.expertise,
    worksFor: { "@id": `${SITE_BASE}/#organization` },
  }
}
