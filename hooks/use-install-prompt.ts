"use client"

import { useEffect, useState, useCallback } from "react"

/* Chrome/Edge/Android fire `beforeinstallprompt` when the page
   qualifies as an installable PWA (manifest + service worker +
   HTTPS) and the user hasn't already installed or dismissed it
   recently. Safari (iOS and macOS) never fires this event — there's
   no programmatic install there, only the manual Share ▸ Add to
   Home Screen / Add to Dock flow, so iOS gets its own flag instead
   of a prompt() call. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/* The event fires (at most) ONCE per page load, well before most
   people ever open the mobile hamburger menu — but that menu's
   "Install App" entry doesn't exist in the DOM until it's opened,
   so a hook-local listener on that instance would almost always
   miss it. Capturing it here, at module scope, the moment the page
   loads means every component using useInstallPrompt() below —
   including ones that mount long after the event fired — can still
   see it, instead of each keeping its own (usually empty) copy. */
let capturedPrompt: BeforeInstallPromptEvent | null = null
const subscribers = new Set<() => void>()

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    capturedPrompt = event as BeforeInstallPromptEvent
    subscribers.forEach((notify) => notify())
  })

  window.addEventListener("appinstalled", () => {
    capturedPrompt = null
    subscribers.forEach((notify) => notify())
  })
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own (non-standard) flag for "already added to
    // the home screen".
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false

  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function useInstallPrompt() {
  const [, forceRender] = useState(0)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())

    const notify = () => {
      setInstalled(isStandalone())
      forceRender((count) => count + 1)
    }

    subscribers.add(notify)
    return () => {
      subscribers.delete(notify)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!capturedPrompt) return false

    await capturedPrompt.prompt()
    const { outcome } = await capturedPrompt.userChoice
    capturedPrompt = null
    subscribers.forEach((notify) => notify())
    return outcome === "accepted"
  }, [])

  return {
    // True once Chrome/Edge/Android has confirmed the page is
    // installable and handed us a real prompt to trigger.
    canPromptInstall: capturedPrompt !== null,
    // iOS never gets a native prompt — show manual instructions
    // instead, but only if it isn't already installed.
    showIOSInstructions: isIOS() && !installed,
    installed,
    promptInstall,
  }
}
