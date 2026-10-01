// lib/structured-data.ts
//
// schema.org JSON-LD for search engines: who runs the site (Organization),
// the site itself (WebSite) and the product (WebApplication, free to use).
// Rendered on the homepage by <JsonLd>. Facts only — no ratings or reviews
// we don't have.

import { SITE_BASE } from "@/lib/site-base"
import { CONTACT_EMAIL } from "@/lib/legal"

const ORG_ID = `${SITE_BASE}/#organization`

export const HOME_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Lincoln Navigation",
      url: SITE_BASE,
      logo: `${SITE_BASE}/logo/lincoln-navigation-logo.webp`,
      email: CONTACT_EMAIL,
      areaServed: { "@type": "Country", name: "Ghana" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_BASE}/#website`,
      name: "Lincoln Navigation",
      url: SITE_BASE,
      inLanguage: "en",
      publisher: { "@id": ORG_ID },
    },
    {
      "@type": "WebApplication",
      name: "Lincoln Navigation",
      url: `${SITE_BASE}/app`,
      applicationCategory: "TravelApplication",
      operatingSystem: "Any (web browser; installable as an app)",
      description:
        "Maps and turn-by-turn directions for Ghana — by car, trotro, motorbike, bicycle or on foot — with place search, road hazard reports and weather along the route.",
      areaServed: { "@type": "Country", name: "Ghana" },
      offers: { "@type": "Offer", price: "0", priceCurrency: "GHS" },
      publisher: { "@id": ORG_ID },
    },
  ],
}
