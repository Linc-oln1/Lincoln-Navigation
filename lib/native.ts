// lib/native.ts  (client only)
//
// Bridges to the iPhone app (mobile/ios, Capacitor). The site is loaded
// from www.lincolnnavigation.com inside the app, and Capacitor injects
// `window.Capacitor` into the page — so the site can call native plugins
// without bundling any Capacitor packages. Everywhere else (browsers, the
// Android TWA) these helpers fall back to the normal web APIs.
//
//   geo()          navigator.geolocation-shaped; native GPS in the app, so
//                  iOS shows one location prompt instead of two
//   hapticTurn()   a light tap when a turn instruction is announced
//   startOAuth()   Google / Apple sign-in in Safari's in-app browser — Google
//                  blocks sign-in inside embedded web views — then back into
//                  the app through the custom URL scheme (NativeBridge)

import { createClient } from "@/lib/supabase/client"

/** Custom URL scheme registered in mobile/ios (Info.plist CFBundleURLTypes). */
export const APP_URL_SCHEME = "com.lincolnnavigation.app"
export const OAUTH_RETURN_URL = `${APP_URL_SCHEME}://auth-callback`

interface PluginListener {
  remove: () => Promise<void> | void
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  Plugins?: Record<string, any>
}

function capacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
  return cap?.isNativePlatform?.() ? cap : null
}

/** True inside the iPhone app. */
export function isNativeApp(): boolean {
  return capacitor() !== null
}

function plugin<T = any>(name: string): T | null {
  return (capacitor()?.Plugins?.[name] as T) ?? null
}

/* =========================================================
   GEOLOCATION
========================================================= */

type GeoSuccess = (position: GeolocationPosition) => void
type GeoError = (error: GeolocationPositionError) => void

function toPosition(p: any): GeolocationPosition {
  return {
    coords: {
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      accuracy: p.coords.accuracy,
      altitude: p.coords.altitude ?? null,
      altitudeAccuracy: p.coords.altitudeAccuracy ?? null,
      heading: p.coords.heading ?? null,
      speed: p.coords.speed ?? null,
    },
    timestamp: p.timestamp ?? Date.now(),
  } as GeolocationPosition
}

function toError(e: any): GeolocationPositionError {
  const message = String(e?.message ?? e ?? "Location unavailable")
  const denied = /denied|permission/i.test(message)
  return {
    code: denied ? 1 : 2,
    message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError
}

let nextWatchId = 1
const nativeWatches = new Map<number, Promise<string>>()

const nativeGeolocation = {
  getCurrentPosition(success: GeoSuccess, error?: GeoError | null, options?: PositionOptions) {
    plugin("Geolocation")!
      .getCurrentPosition(options ?? {})
      .then((p: any) => success(toPosition(p)))
      .catch((e: any) => error?.(toError(e)))
  },
  watchPosition(success: GeoSuccess, error?: GeoError | null, options?: PositionOptions): number {
    const id = nextWatchId++
    nativeWatches.set(
      id,
      plugin("Geolocation")!.watchPosition(options ?? {}, (p: any, e: any) => {
        if (e) error?.(toError(e))
        else if (p) success(toPosition(p))
      })
    )
    return id
  },
  clearWatch(id: number) {
    const pending = nativeWatches.get(id)
    nativeWatches.delete(id)
    void pending?.then((callbackId) => plugin("Geolocation")?.clearWatch({ id: callbackId }))
  },
}

type GeoApi = Pick<Geolocation, "getCurrentPosition" | "watchPosition" | "clearWatch">

/**
 * navigator.geolocation, or the native GPS inside the iPhone app. Typed
 * like navigator.geolocation (callers already guard for the server and
 * browsers without GPS, where this is undefined at runtime).
 */
export function geo(): GeoApi {
  if (plugin("Geolocation")) return nativeGeolocation
  return (typeof navigator === "undefined" ? undefined : navigator.geolocation) as GeoApi
}

/* =========================================================
   HAPTICS
========================================================= */

/** A light tap for a turn instruction. No-op outside the app. */
export function hapticTurn(): void {
  void plugin("Haptics")?.impact({ style: "MEDIUM" }).catch(() => {})
}

/* =========================================================
   OAUTH (Google / Apple)
========================================================= */

/**
 * Starts OAuth sign-in. On the web this is the normal full-page redirect.
 * In the app it opens the provider in Safari's in-app browser and returns
 * through com.lincolnnavigation.app://auth-callback, which NativeBridge
 * hands to /auth/callback inside the app — the PKCE verifier cookie lives
 * in the app's web view, so the code must be exchanged there.
 */
export async function startOAuth(
  provider: "google" | "apple",
  webRedirectTo: string,
  next: string
): Promise<{ error: Error | null }> {
  const supabase = createClient()
  const browser = plugin("Browser")

  if (!browser) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: webRedirectTo },
    })
    return { error }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${OAUTH_RETURN_URL}?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
    },
  })
  if (error || !data?.url) return { error: error ?? new Error("Could not start sign-in.") }

  await browser.open({ url: data.url, presentationStyle: "popover" })
  return { error: null }
}

/** Links Google to the signed-in account — same browser hand-off as startOAuth. */
export async function startLinkGoogle(webRedirectTo: string, next: string): Promise<{ error: Error | null }> {
  const supabase = createClient()
  const browser = plugin("Browser")

  if (!browser) {
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: webRedirectTo },
    })
    return { error }
  }

  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: `${OAUTH_RETURN_URL}?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
    },
  })
  if (error || !data?.url) return { error: error ?? new Error("Could not start linking.") }

  await browser.open({ url: data.url, presentationStyle: "popover" })
  return { error: null }
}

/**
 * Listens for com.lincolnnavigation.app://auth-callback?code=…&next=… and
 * finishes the sign-in inside the app. Returns a cleanup function.
 */
export function listenForOAuthReturn(): () => void {
  const app = plugin("App")
  if (!app) return () => {}

  let handle: PluginListener | null = null
  let cancelled = false

  Promise.resolve(
    app.addListener("appUrlOpen", (event: { url: string }) => {
      if (!event?.url?.startsWith(OAUTH_RETURN_URL)) return
      void plugin("Browser")?.close().catch(() => {})
      const url = new URL(event.url.replace(`${APP_URL_SCHEME}://`, "https://app/"))
      const code = url.searchParams.get("code")
      const next = url.searchParams.get("next") || "/app"
      const error = url.searchParams.get("error_description") || url.searchParams.get("error")
      window.location.href = code
        ? `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
        : `/login?error=${encodeURIComponent(error || "auth")}`
    })
  ).then((h: PluginListener) => {
    if (cancelled) void h.remove()
    else handle = h
  })

  return () => {
    cancelled = true
    void handle?.remove()
  }
}
