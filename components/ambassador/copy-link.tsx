"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

/** The promoter's tracking link with a copy button. */
export function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://www.lincolnnavigation.com/signup?ref=${code}`
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="truncate font-mono text-sm">{url}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          } catch {}
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  )
}
