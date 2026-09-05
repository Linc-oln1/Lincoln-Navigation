// Lincoln Navigation service worker
//
// Kept deliberately simple and conservative, since this app's whole
// value is live data (routes, places, positions) — the only jobs
// here are (1) satisfy the "installable PWA" requirement browsers
// check for, and (2) let the app shell still open offline instead
// of showing a browser error.
//
// Anything that must always be fresh (every /api/* route, and map
// tiles from other origins) is deliberately left untouched below —
// this worker never intercepts those, so they always go straight to
// the network exactly as if it didn't exist.

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
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

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
