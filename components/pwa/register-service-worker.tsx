"use client"

import { useEffect } from "react"

/* Renders nothing — just registers /sw.js once the page has
   finished loading, which is what makes Chrome/Edge/Android treat
   the site as an installable PWA in the first place. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return
    }

    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => {
        console.error("Lincoln Navigation: service worker registration failed", error)
      })
  }, [])

  return null
}
