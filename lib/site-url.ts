// lib/site-url.ts
//
// The canonical public origin for building absolute redirect URLs.
// Prefers NEXT_PUBLIC_SITE_URL (set in prod to avoid the apex→www
// redirect mid-flow), falls back to the request's own origin.

export function siteOrigin(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    new URL(req.url).origin
  )
}
