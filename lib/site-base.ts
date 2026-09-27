// lib/site-base.ts
//
// The public origin for absolute URLs that aren't tied to a request (the
// sitemap and robots file). Same env var the redirects use.

export const SITE_BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "https://www.lincolnnavigation.com"
