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
      {/* Decorative warm glow field, matching /about's hero treatment */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#c9a06e]/[0.10] blur-[100px]" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-[#c9a06e]/[0.08] blur-[100px]" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-[#c9a06e]/[0.06] blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-14">
        <Link
          href="/"
          className="mb-6 inline-flex w-fit items-center gap-2 text-sm text-neutral-500 hover:text-[#d9b98c] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to LincolnNavigation
        </Link>

        {/* Header card, echoing the dashboard-style app bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#c9a06e]/15 bg-[#161310] px-4 py-3">
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

        <h1 className="mt-7 text-2xl font-extrabold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
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
          <div className="mt-7 space-y-3">
            {/* Focused card — email, the primary method */}
            <div className="rounded-2xl border border-[#c9a06e]/15 bg-[#161310] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c9a06e]/15">
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
                  className="w-full rounded-xl border border-[#c9a06e]/20 bg-black/30 px-4 py-2.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-[#c9a06e]/50"
                />
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#c9a06e] px-4 py-2.5 text-sm font-semibold text-[#1a1206] transition hover:brightness-105 disabled:opacity-60"
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
                className="flex items-center gap-3 rounded-2xl border border-[#c9a06e]/15 bg-[#161310] p-4 text-left transition hover:border-[#c9a06e]/30 disabled:opacity-60"
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
                className="flex items-center gap-3 rounded-2xl border border-dashed border-[#c9a06e]/15 bg-[#161310]/50 p-4 transition hover:border-[#c9a06e]/30"
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
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600" />
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
