// Lincoln Navigation service worker
//
// Kept deliberately simple and conservative, since this app's whole
// value is live data (routes, places, positions) — the only jobs
// here are (1) satisfy the "installable PWA" requirement browsers
// check for, and (2) let the app shell still open offline instead
// of showing a browser error.
//
// Anything that must always be fresh (every /api/* route, and other
// origins' requests) is left untouched below — the one exception is
// OpenFreeMap (the base map), which is answered from the areas a
// Premium user saved with "Offline maps" (caches named "ln-offline-*").

const CACHE_NAME = "lincoln-nav-shell-v1"

const APP_SHELL = ["/", "/app", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Only retire old app-shell caches — never a saved offline map.
            .filter((key) => key.startsWith("lincoln-nav-shell-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

const OFM_HOST = "tiles.openfreemap.org"
// Tiles, icons and fonts never change for a given URL: saved copy first.
const OFM_STATIC = /\/(fonts|sprites)\/|\/\d+\/\d+\/\d+(\.\w+)?$/

function offlineMatch(request) {
  return caches.match(request, { ignoreVary: true })
}

function handleBaseMap(event) {
  const { request } = event
  if (OFM_STATIC.test(new URL(request.url).pathname)) {
    // Saved copy if there is one, otherwise the network as normal.
    event.respondWith(offlineMatch(request).then((hit) => hit || fetch(request)))
  } else {
    // Style and tile index: the live copy when online (so updates arrive),
    // the saved copy when there's no connection.
    event.respondWith(
      fetch(request).catch(() =>
        offlineMatch(request).then((hit) => hit || Response.error())
      )
    )
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method === "GET" && new URL(request.url).hostname === OFM_HOST) {
    handleBaseMap(event)
    return
  }

  // Only ever handle our own GET requests — never touch /api/* (live
  // data must always hit the network) or cross-origin requests (map
  // tiles, routing/geocoding providers, etc).
  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin ||
    request.url.includes("/api/")
  ) {
    return
  }

  const isNavigation = request.mode === "navigate"

  // Network-first for pages, so anyone online always gets the
  // latest build; only falls back to the cached shell when the
  // network request itself fails (i.e. offline).
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    )
    return
  }

  // Cache-first for everything else same-origin (Next's static
  // chunks are content-hashed, so this is always safe).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    })
  )
})
