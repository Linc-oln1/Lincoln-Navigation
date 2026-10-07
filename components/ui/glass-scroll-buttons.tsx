"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface GlassScrollButtonsProps {
  /** The element that wraps a <ScrollArea>; the buttons find its scrolling viewport. */
  containerRef: RefObject<HTMLElement | null>
  upLabel: string
  downLabel: string
  className?: string
}

const EDGE = 24 // px from the top or bottom that counts as "at the edge"

const glass =
  "pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-foreground/15 bg-foreground/[0.08] " +
  "text-foreground backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_24px_rgba(0,0,0,0.35)] " +
  "transition-all duration-200 hover:bg-foreground/[0.14] active:scale-90"

/**
 * Two frosted-glass round buttons that page a scroll area up and down. Each
 * fades in only when there is more to scroll in that direction. Place inside
 * the same `relative` wrapper as the scroll area.
 */
export function GlassScrollButtons({ containerRef, upLabel, downLabel, className }: GlassScrollButtonsProps) {
  const [canUp, setCanUp] = useState(false)
  const [canDown, setCanDown] = useState(false)

  const viewport = useCallback(
    () => containerRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? null,
    [containerRef],
  )

  useEffect(() => {
    const el = viewport()
    if (!el) return
    const update = () => {
      setCanUp(el.scrollTop > EDGE)
      setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - EDGE)
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    // Content changes size as places load; re-check when it does.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null
    ro?.observe(el)
    if (el.firstElementChild) ro?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener("scroll", update)
      ro?.disconnect()
    }
  }, [viewport])

  const page = (dir: 1 | -1) => {
    const el = viewport()
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollBy({ top: dir * el.clientHeight * 0.85, behavior: reduce ? "auto" : "smooth" })
  }

  return (
    <div className={cn("pointer-events-none absolute bottom-5 right-4 z-10 flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => page(-1)}
        aria-label={upLabel}
        aria-hidden={!canUp}
        tabIndex={canUp ? 0 : -1}
        className={cn(glass, !canUp && "pointer-events-none translate-y-2 opacity-0")}
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => page(1)}
        aria-label={downLabel}
        aria-hidden={!canDown}
        tabIndex={canDown ? 0 : -1}
        className={cn(glass, !canDown && "pointer-events-none -translate-y-2 opacity-0")}
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  )
}
