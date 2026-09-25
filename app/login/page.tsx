"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Loader2, Mail, UserRound } from "lucide-react"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/client"

type Busy = null | "google" | "email"

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
  const [busy, setBusy] = useState<Busy>(null)
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
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Decorative glow field */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-14">
        <Link
          href="/"
          className="mb-6 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to LincolnNavigation
        </Link>

        <div className="rounded-[28px] border border-border bg-card/70 p-7 shadow-2xl backdrop-blur-2xl sm:p-9">
          {/* Logo */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-border bg-card/90 shadow-xl shadow-primary/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/lincoln-navigation-logo.webp"
              alt="LincolnNavigation"
              className="h-11 w-11 object-contain"
            />
          </div>

          <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            Sync your saved places and manage your Premium plan.
          </p>

          {!AUTH_ENABLED ? (
            <div className="mt-7 rounded-2xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
              Sign-in isn&rsquo;t available yet — the Supabase project needs to
              be connected (see docs/SUPABASE_SETUP.md).
            </div>
          ) : sent ? (
            <div className="mt-7 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-4 text-sm">
              <p className="font-semibold">Check your email</p>
              <p className="mt-1 text-muted-foreground">
                We sent a sign-in link to{" "}
                <span className="text-foreground">{email}</span>. Open it on
                this device.
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              <form onSubmit={signInWithEmail} className="space-y-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-border bg-input px-4 py-3 pl-11 text-sm outline-none focus:border-primary"
                  />
                </div>
                <PrimaryButton
                  busy={busy === "email"}
                  icon={<Mail className="h-4 w-4" />}
                  label="Email me a sign-in link"
                  disabled={busy !== null}
                />
              </form>

              {error && (
                <p className="text-center text-xs text-destructive">{error}</p>
              )}
            </div>
          )}

          <div className="mt-7 flex items-center gap-3 text-[10px] font-semibold tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            OR CONTINUE WITH
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className={`mt-4 grid gap-3 ${AUTH_ENABLED ? "grid-cols-2" : "grid-cols-1"}`}>
            {AUTH_ENABLED && (
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={busy !== null}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card/60 py-4 hover:bg-secondary transition disabled:opacity-60"
              >
                {busy === "google" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <GoogleGlyph />
                )}
                <span className="text-[11px] font-medium text-muted-foreground">
                  Google
                </span>
              </button>
            )}

            <Link
              href={next}
              className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 py-4 hover:border-foreground hover:text-foreground transition"
            >
              <UserRound className="h-5 w-5" />
              <span className="text-[11px] font-medium text-muted-foreground">
                Guest
              </span>
            </Link>
          </div>
        </div>

        <p className="mt-7 text-center text-[11px] tracking-[0.2em] text-muted-foreground">
          MAP &bull; NAVIGATE &bull; EXPLORE
        </p>
      </div>
    </main>
  )
}

function PrimaryButton({
  busy,
  icon,
  label,
  disabled,
}: {
  busy: boolean
  icon: React.ReactNode
  label: string
  disabled: boolean
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="group relative flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-[var(--primary-dark)] py-3.5 pl-5 pr-14 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110 transition disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
      <span className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  )
}

function GoogleGlyph() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C17.1 3 14.8 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.1-.2-1.6H12z"
      />
    </svg>
  )
}
