"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"

/** Shows the user's referral code and copies / shares their signup link. */
export function CopyReferral({ code }: { code: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/signup?ref=${code}`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Lincoln Navigation", text: t("ac.refShare"), url })
        return
      } catch {
        // dismissed or unsupported — fall through to copying
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="font-mono text-base font-bold tracking-widest">{code}</span>
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t("ac.refCopied") : t("ac.refCopy")}
      </button>
    </div>
  )
}
