import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import {
  parseStorePlatform,
  STORE_APP_BLOCKED_PATHS,
  STORE_APP_COOKIE,
  STORE_APP_PARAM,
  storePlatformOf,
} from "@/lib/store-app"

// Keeps the Supabase auth session fresh on every request. No-ops
// when auth isn't configured.
//
// Also handles store-app mode (lib/store-app.ts): remembers the
// Play / App Store wrapper in a cookie and keeps it off the
// purchase pages.
//
// Next 16 has started renaming this convention to `proxy.ts`, but
// as of 16.2 the Turbopack dev server doesn't load a `proxy.ts`
// export reliably, so we stay on `middleware.ts` (still fully
// supported — it only logs a deprecation notice).
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const fromParam = parseStorePlatform(searchParams.get(STORE_APP_PARAM))
  const platform = fromParam ?? storePlatformOf(request)

  if (platform && STORE_APP_BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone()
    url.pathname = "/app"
    url.search = ""
    return withStoreCookie(NextResponse.redirect(url), platform, request)
  }

  return withStoreCookie(await updateSession(request), platform, request)
}

function withStoreCookie(response: NextResponse, platform: string | null, request: NextRequest) {
  if (platform && request.cookies.get(STORE_APP_COOKIE)?.value !== platform) {
    response.cookies.set(STORE_APP_COOKIE, platform, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 5,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      // Read by the inline <head> script, so not httpOnly.
      httpOnly: false,
    })
  }
  return response
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
