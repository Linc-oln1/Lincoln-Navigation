"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navigation } from "lucide-react"
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

type Busy = null | "google" | "email"

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f1efe7]" />}>
      <SignupContent />
    </Suspense>
  )
}

function SignupContent() {
  const next = useNextParam()
  const router = useRouter()
  const { user } = useSession()

  useEffect(() => {
    if (user) router.replace(next)
  }, [user, next, router])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState<Busy>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextQuery = next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.")
      return
    }
    setBusy("email")
    setError(null)
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: callbackUrl(next),
      },
    })
    setBusy(null)
    if (error) {
      setError(error.message)
      return
    }
    // With email confirmation on, there's no session until they click the link.
    if (data.session) router.replace(next)
    else setSent(true)
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
          Already have an account?{" "}
          <Link href={`/login${nextQuery}`} className={topLinkClass}>
            Sign in
          </Link>
        </>
      }
      icon={<Navigation className="h-5 w-5" />}
      eyebrow="A better way to explore"
      title="Create your account"
      subtitle="Save your favourite places and make every trip yours."
    >
      {!AUTH_ENABLED ? (
        <Notice>
          Sign-up isn&rsquo;t available yet — the Supabase project needs to be
          connected (see docs/SUPABASE_SETUP.md).
        </Notice>
      ) : sent ? (
        <Notice title="Check your email">
          We sent a confirmation link to <strong>{email}</strong>. Open it on
          this device to finish creating your account.
        </Notice>
      ) : (
        <>
          <form onSubmit={signUp} className="space-y-6">
            <Field
              label="Full name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            {error && <Notice tone="error">{error}</Notice>}
            <SubmitButton busy={busy === "email"}>Create account</SubmitButton>
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
