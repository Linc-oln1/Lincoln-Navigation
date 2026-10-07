// lib/store-app.ts
//
// "Store app" mode: the site running inside the Google Play (Trusted Web
// Activity) or App Store (Capacitor) wrapper — see docs/APP_STORES.md.
//
// Both stores forbid selling digital plans through Paystack inside the app,
// so in this mode every purchase path is hidden (links to /pricing and
// /advertise, via a CSS rule keyed on <html data-store-app>) and blocked
// (middleware redirects those pages; the checkout APIs refuse). People who
// bought on the website still get their plan when they sign in.
//
// How the wrapper is recognised, once, then remembered in a cookie:
//   Android — the TWA opens the start URL with ?app=android
//   iOS     — Capacitor appends STORE_APP_UA_TOKEN to the user agent

export const STORE_APP_COOKIE = "ln_app"
export const STORE_APP_PARAM = "app"
export const STORE_APP_UA_TOKEN = "LincolnNavigationApp"

export type StorePlatform = "android" | "ios"

/** Paths a store-app visitor is redirected away from. */
export const STORE_APP_BLOCKED_PATHS = ["/pricing", "/advertise"]

export function parseStorePlatform(value: string | null | undefined): StorePlatform | null {
  return value === "android" || value === "ios" ? value : null
}

/** Store-app platform for a request (cookie, then user agent), or null. */
export function storePlatformOf(req: Request): StorePlatform | null {
  const cookie = req.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${STORE_APP_COOKIE}=`))
    ?.slice(STORE_APP_COOKIE.length + 1)
  const fromCookie = parseStorePlatform(cookie)
  if (fromCookie) return fromCookie
  return req.headers.get("user-agent")?.includes(STORE_APP_UA_TOKEN) ? "ios" : null
}

/**
 * Inline <head> script: sets <html data-store-app="…"> before first paint
 * so purchase links never flash. Mirrors storePlatformOf on the client.
 */
export const STORE_APP_HEAD_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${STORE_APP_COOKIE}=(android|ios)/);var p=m?m[1]:(navigator.userAgent.indexOf("${STORE_APP_UA_TOKEN}")>-1?"ios":null);if(p)document.documentElement.setAttribute("data-store-app",p)}catch(e){}`

/**
 * Client only: true inside the iPhone app. Apple's App Tracking Transparency
 * rules make Google ads a problem there, so no ads are shown or loaded in it
 * (see components/ads). Reads the attribute STORE_APP_HEAD_SCRIPT sets.
 */
export function isIosStoreApp(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-store-app") === "ios"
}
