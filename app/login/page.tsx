"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const params = useSearchParams()
  const next = params.get("next") || "/app"
  const hadError = params.get("error")

  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState<null | "google" | "email">(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(
    hadError ? "That sign-in link didn't work. Try again." : null,
  )

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

  async function signInWithGoogle() {
    setBusy("google")
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    })
    if (error) {
      setError(error.message)
      setBusy(null)
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setBusy("email")
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    })
    setBusy(null)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to LincolnNavigation
        </Link>

        <h1 className="text-2xl font-extrabold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sync your saved places across devices and manage your Premium plan.
        </p>

        {!AUTH_ENABLED ? (
          <div className="mt-8 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Sign-in isn&rsquo;t available yet — the Supabase project needs to be
            connected (see docs/SUPABASE_SETUP.md).
          </div>
        ) : sent ? (
          <div className="mt-8 rounded-xl border border-primary/40 bg-primary/10 px-4 py-4 text-sm">
            <p className="font-semibold">Check your email</p>
            <p className="mt-1 text-muted-foreground">
              We sent a sign-in link to <span className="text-foreground">{email}</span>.
              Open it on this device.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <button
              onClick={signInWithGoogle}
              disabled={busy !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition disabled:opacity-60"
            >
              {busy === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleGlyph />
              )}
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={signInWithEmail} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={busy !== null}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 transition disabled:opacity-60"
              >
                {busy === "email" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Email me a sign-in link
              </button>
            </form>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          You can use the whole app without an account — signing in only adds
          sync and Premium.
        </p>
      </div>
    </main>
  )
}

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C17.1 3 14.8 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.1-.2-1.6H12z"
      />
    </svg>
  )
}
