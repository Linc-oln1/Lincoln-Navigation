import type { MetadataRoute } from "next"
import { SITE_BASE } from "@/lib/site-base"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Not for search results: the API, account and sign-in pages, the
        // callback, and the private driver and trip-sharing links (/drive/<secret>, /track/<secret>).
        disallow: ["/api/", "/account", "/login", "/signup", "/reset-password", "/auth/", "/drive/", "/track/"],
      },
    ],
    sitemap: `${SITE_BASE}/sitemap.xml`,
    host: SITE_BASE,
  }
}
