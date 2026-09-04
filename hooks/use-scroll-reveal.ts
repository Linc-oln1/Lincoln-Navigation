"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Tracks whether an element has scrolled meaningfully into view, once —
 * for one-shot "fade/rise in" section reveals (see product-showcase.tsx
 * for the pattern this was lifted from).
 */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}
