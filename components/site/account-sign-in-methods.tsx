"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"
import { isNativeApp, startLinkGoogle } from "@/lib/native"

/**
 * Sign-in methods on the account: shows whether Google is linked and
 * offers "Connect" when it isn't. Linking needs "Allow manual linking"
 * on in Supabase (Authentication → Sign In / Providers).
 */
export function AccountSignInMethods() {
  const params = useSearchParams()
  const [google, setGoogle] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const { t } = useI18n()
  // A translation key (follows a language switch) or raw text from the
  // auth service.
  const [message, setMessage] = useState<{ k: MessageKey } | { raw: string } | null>(
    params.get("link_error") ? { k: "ac.googleErr" } : params.get("linked") === "google" ? { k: "ac.googleNow" } : null,
  )

  useEffect(() => {
    createClient()
      .auth.getUserIdentities()
      .then(({ data }) => {
        setGoogle(Boolean(data?.identities.some((i) => i.provider === "google")))
      })
  }, [])

  async function connectGoogle() {
    setBusy(true)
    setMessage(null)
    const next = "/account?linked=google"
    const { error } = await startLinkGoogle(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      next,
    )
    // On success the browser is already heading to Google
    // (or, in the iPhone app, Google is open in a sheet).
    if (!error && isNativeApp()) setBusy(false)
    if (error) {
      setMessage(/manual linking/i.test(error.message) ? { k: "ac.linkOff" } : { raw: error.message })
      setBusy(false)
    }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-sm text-muted-foreground">{t("ac.google")}</dt>
        <dd className="text-right">
          {google === null ? (
            <span className="text-sm text-muted-foreground">&hellip;</span>
          ) : google ? (
            <span className="text-sm font-medium">{t("ac.connected")}</span>
          ) : (
            <button
              type="button"
              onClick={connectGoogle}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("ac.connect")}
            </button>
          )}
        </dd>
      </div>
      {message && <p className="mt-2 text-xs text-muted-foreground">{"raw" in message ? message.raw : t(message.k)}</p>}
    </div>
  )
}
