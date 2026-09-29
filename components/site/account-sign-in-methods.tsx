"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

/**
 * Sign-in methods on the account: shows whether Google is linked and
 * offers "Connect" when it isn't. Linking needs "Allow manual linking"
 * on in Supabase (Authentication → Sign In / Providers).
 */
export function AccountSignInMethods() {
  const params = useSearchParams()
  const [google, setGoogle] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(
    params.get("link_error")
      ? "Couldn’t connect Google. It may already be used by another account."
      : params.get("linked") === "google"
        ? "Google is now connected."
        : null,
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
    const { error } = await createClient().auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    // On success the browser is already heading to Google.
    if (error) {
      setMessage(
        /manual linking/i.test(error.message)
          ? "Connecting accounts isn’t switched on yet."
          : error.message,
      )
      setBusy(false)
    }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-sm text-muted-foreground">Google sign-in</dt>
        <dd className="text-right">
          {google === null ? (
            <span className="text-sm text-muted-foreground">&hellip;</span>
          ) : google ? (
            <span className="text-sm font-medium">Connected</span>
          ) : (
            <button
              type="button"
              onClick={connectGoogle}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Connect
            </button>
          )}
        </dd>
      </div>
      {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
    </div>
  )
}
