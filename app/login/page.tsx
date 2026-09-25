"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, ChevronRight, Loader2, Mail, UserRound } from "lucide-react"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/client"

type Busy = null | "google" | "email"

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0d0d0d]" />}>
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
    <main className="relative min-h-screen overflow-hidden bg-[#0d0d0d] text-neutral-300">
      {/* Logo used directly as a soft blurred background — no dark scrim on top of it */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/lincoln-navigation-mark.webp"
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 object-cover opacity-40 blur-[70px]"
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-14">
        <Link
          href="/"
          className="landing-fade-up mb-6 inline-flex w-fit items-center gap-2 text-sm text-neutral-500 hover:text-[#d9b98c] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to LincolnNavigation
        </Link>

        {/* Header card, echoing the dashboard-style app bar */}
        <div
          className="landing-fade-up flex items-center gap-3 rounded-2xl border border-[#c9a06e]/15 bg-[#161310]/90 px-4 py-3 backdrop-blur-sm transition-colors hover:border-[#c9a06e]/30"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c9a06e]/20 bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/lincoln-navigation-logo.webp"
              alt="LincolnNavigation"
              className="h-7 w-7 object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-white">LincolnNavigation</p>
            <p className="text-xs text-neutral-500">Ghana Maps &amp; Navigation</p>
          </div>
        </div>

        <h1
          className="landing-fade-up mt-7 text-2xl font-extrabold tracking-tight text-white"
          style={{ animationDelay: "120ms" }}
        >
          Welcome back
        </h1>
        <p
          className="landing-fade-up mt-1.5 text-sm text-neutral-500"
          style={{ animationDelay: "120ms" }}
        >
          Sync your saved places and manage your Premium plan.
        </p>

        {!AUTH_ENABLED ? (
          <div className="mt-7 rounded-2xl border border-dashed border-[#c9a06e]/20 px-4 py-3 text-sm text-neutral-500">
            Sign-in isn&rsquo;t available yet — the Supabase project needs to
            be connected (see docs/SUPABASE_SETUP.md).
          </div>
        ) : sent ? (
          <div className="mt-7 rounded-2xl border border-[#c9a06e]/25 bg-[#c9a06e]/10 px-4 py-4 text-sm">
            <p className="font-semibold text-[#d9b98c]">Check your email</p>
            <p className="mt-1 text-neutral-400">
              We sent a sign-in link to{" "}
              <span className="text-white">{email}</span>. Open it on this
              device.
            </p>
          </div>
        ) : (
          <div
            className="landing-fade-up mt-7 space-y-3"
            style={{ animationDelay: "180ms" }}
          >
            {/* Focused card — email, the primary method */}
            <div className="group rounded-2xl border border-[#c9a06e]/15 bg-[#161310] p-5 transition-colors focus-within:border-[#c9a06e]/40 hover:border-[#c9a06e]/25">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c9a06e]/15 transition-transform duration-200 group-focus-within:scale-110">
                  <Mail className="h-4 w-4 text-[#c9a06e]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Email</p>
                  <p className="text-xs text-neutral-500">
                    Get a one-tap sign-in link
                  </p>
                </div>
              </div>

              <form onSubmit={signInWithEmail} className="mt-4 space-y-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#c9a06e]/20 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#c9a06e]/50"
                />
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#c9a06e] px-4 py-2.5 text-sm font-semibold text-[#1a1206] transition-all duration-150 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
                >
                  {busy === "email" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Email me a sign-in link
                </button>
              </form>
            </div>

            {/* Grid of alternative methods, echoing the dashboard's device cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={busy !== null}
                className="flex items-center gap-3 rounded-2xl border border-[#c9a06e]/15 bg-[#161310] p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#c9a06e]/30 hover:shadow-lg hover:shadow-black/20 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/30">
                  {busy === "google" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#c9a06e]" />
                  ) : (
                    <GoogleGlyph />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Google</p>
                  <p className="truncate text-xs text-neutral-500">
                    Fast sign-in
                  </p>
                </div>
              </button>

              <Link
                href={next}
                className="group flex items-center gap-3 rounded-2xl border border-dashed border-[#c9a06e]/15 bg-[#161310]/50 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#c9a06e]/30 hover:bg-[#161310] hover:shadow-lg hover:shadow-black/20 active:translate-y-0 active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/30">
                  <UserRound className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">Guest</p>
                  <p className="truncate text-xs text-neutral-500">
                    Skip it
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {error && (
              <p className="px-1 text-center text-xs text-red-400">{error}</p>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] tracking-[0.2em] text-neutral-600">
          MAP &bull; NAVIGATE &bull; EXPLORE
        </p>
      </div>
    </main>
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
