"use client"

import { useEffect, useState, type RefObject } from "react"

/**
 * True once any of the element (threshold 1%) has entered the viewport
 * extended by `rootMargin`, and stays true. Used to hold off heavy media
 * (background videos) until the visitor scrolls to it, instead of
 * downloading it with the page.
 *
 * The small threshold matters: a section that starts exactly at the fold
 * (right under a full-height hero) "touches" the viewport on load, and a
 * zero threshold would count that as visible.
 */
export function useNearViewport(ref: RefObject<Element | null>, rootMargin = "0px") {
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (typeof IntersectionObserver === "undefined") {
      setNear(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold: 0.01 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, rootMargin, near])

  return near
}
