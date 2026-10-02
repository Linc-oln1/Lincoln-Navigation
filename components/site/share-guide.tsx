"use client"

import { useState } from "react"
import { Check, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * "Send this to someone" buttons for the guide pages. WhatsApp is how
 * links travel in Ghana, so it gets its own button (wa.me works on phones
 * and desktop); the second button opens the phone's share sheet, or copies
 * the link where there isn't one.
 */
export function ShareGuide({ url, text, className }: { url: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url })
      } catch {
        /* closed the sheet */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — nothing useful to do */
    }
  }

  const button =
    "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(button, "bg-[#25d366] text-[#073b1c] hover:brightness-105")}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z" />
        </svg>
        Send on WhatsApp
      </a>
      <button
        type="button"
        onClick={share}
        className={cn(button, "border border-black/15 bg-white/60 hover:bg-white")}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" aria-hidden /> Link copied
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </>
        )}
      </button>
    </div>
  )
}
