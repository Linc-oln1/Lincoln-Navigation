import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Keeps the Supabase auth session fresh on every request. No-ops
// when auth isn't configured.
//
// Next 16 has started renaming this convention to `proxy.ts`, but
// as of 16.2 the Turbopack dev server doesn't load a `proxy.ts`
// export reliably, so we stay on `middleware.ts` (still fully
// supported — it only logs a deprecation notice).
export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals (all of _next/, including the
     * HMR socket) and static assets. Also skips /sw.js,
     * /manifest.webmanifest, /ads.txt and the maplibre worker files
     * served from /public.
     */
    "/((?!_next/|favicon\\.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|webm|mp4|woff2?|ttf|eot|ico|txt|xml|js|mjs|css|map)$).*)",
  ],
}
