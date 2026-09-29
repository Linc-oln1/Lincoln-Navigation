"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Route } from "lucide-react"
import { useSession } from "@/hooks/use-session"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/client"
import {
  AltMethods,
  AuthShell,
  Divider,
  Field,
  Notice,
  PasswordField,
  SubmitButton,
  Terms,
  callbackUrl,
  topLinkClass,
  useNextParam,
} from "@/components/auth/auth-shell"

type Busy = null | "google" | "email" | "reset"

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f1efe7]" />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const params = useSearchParams()
  const next = useNextParam()
  const router = useRouter()
  const { user } = useSession()

  // Already signed in? Nothing to do here — carry on to where they were going.
  useEffect(() => {
    if (user) router.replace(next)
  }, [user, next, router])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState<Busy>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    params.get("error") === "link"
      ? "That email link has expired or was already used. Request a new one below."
      : params.get("error")
        ? "That sign-in link didn't work. Try again."
        : null,
  )

  const nextQuery = next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy("email")
    setError(null)
    setInfo(null)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don't match. If you used to sign in with an email link, use “Forgot password?” to set one."
          : error.message,
      )
      setBusy(null)
      return
    }
    router.replace(next)
  }

  async function forgotPassword() {
    if (!email) {
      setError("Enter your email address first, then tap “Forgot password?”.")
      return
    }
    setBusy("reset")
    setError(null)
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl("/reset-password"),
    })
    setBusy(null)
    if (error) setError(error.message)
    else setInfo(`We sent a password reset link to ${email}.`)
  }

  async function signInWithGoogle() {
    setBusy("google")
    setError(null)
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    })
    if (error) {
      setError(error.message)
      setBusy(null)
    }
  }

  return (
    <AuthShell
      topLink={
        <>
          New to LincolnNavigation?{" "}
          <Link href={`/signup${nextQuery}`} className={topLinkClass}>
            Create account
          </Link>
        </>
      }
      icon={<Route className="h-5 w-5" />}
      eyebrow="Your journey continues"
      title="Welcome back"
      subtitle="Sign in to pick up right where you left off."
    >
      {!AUTH_ENABLED ? (
        <Notice>
          Sign-in isn&rsquo;t available yet — the Supabase project needs to be
          connected (see docs/SUPABASE_SETUP.md).
        </Notice>
      ) : (
        <>
          <form onSubmit={signIn} className="space-y-6">
            <Field
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <PasswordField
              id="password"
              label="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              aside={
                <button
                  type="button"
                  onClick={forgotPassword}
                  disabled={busy !== null}
                  className="text-sm font-semibold text-[#1d4466] hover:underline underline-offset-4"
                >
                  {busy === "reset" ? "Sending…" : "Forgot password?"}
                </button>
              }
            />
            {error && <Notice tone="error">{error}</Notice>}
            {info && <Notice>{info}</Notice>}
            <SubmitButton busy={busy === "email"}>Sign in</SubmitButton>
          </form>

          <Divider>Simple, secure access to your map</Divider>
          <AltMethods
            next={next}
            onGoogle={signInWithGoogle}
            googleBusy={busy === "google"}
            disabled={busy !== null}
          />
        </>
      )}
      <Terms />
    </AuthShell>
  )
}
