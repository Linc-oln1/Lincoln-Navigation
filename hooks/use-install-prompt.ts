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
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setInstalled(true)
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    )
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome === "accepted"
  }, [deferredPrompt])

  return {
    // True once Chrome/Edge/Android has confirmed the page is
    // installable and handed us a real prompt to trigger.
    canPromptInstall: deferredPrompt !== null,
    // iOS never gets a native prompt — show manual instructions
    // instead, but only if it isn't already installed.
    showIOSInstructions: isIOS() && !installed,
    installed,
    promptInstall,
  }
}
