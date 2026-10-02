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
  useAuthMsg,
  useNextParam,
  type AuthMsg,
} from "@/components/auth/auth-shell"
import { useI18n } from "@/components/i18n/language-provider"
import { isNativeApp, startOAuth } from "@/lib/native"

type Busy = null | "google" | "apple" | "email" | "reset"

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
  const { t } = useI18n()
  const msg = useAuthMsg()

  // Already signed in? Nothing to do here — carry on to where they were going.
  useEffect(() => {
    if (user) router.replace(next)
  }, [user, next, router])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState<Busy>(null)
  const [info, setInfo] = useState<AuthMsg | null>(null)
  const [error, setError] = useState<AuthMsg | null>(
    params.get("error") === "link" ? { k: "au.errLink" } : params.get("error") ? { k: "au.errSignin" } : null,
  )

  const nextQuery = next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy("email")
    setError(null)
    setInfo(null)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === "Invalid login credentials" ? { k: "au.errCreds" } : { raw: error.message })
      setBusy(null)
      return
    }
    router.replace(next)
  }

  async function forgotPassword() {
    if (!email) {
      setError({ k: "au.errNeedEmail" })
      return
    }
    setBusy("reset")
    setError(null)
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl("/reset-password"),
    })
    setBusy(null)
    if (error) setError({ raw: error.message })
    else setInfo({ k: "au.resetSent", p: { email } })
  }

  async function signInWithProvider(provider: "google" | "apple") {
    setBusy(provider)
    setError(null)
    const { error } = await startOAuth(provider, callbackUrl(next), next)
    if (error) {
      setError({ raw: error.message })
      setBusy(null)
    } else if (isNativeApp()) {
      // The sign-in sheet is open; NativeBridge finishes when it returns.
      setBusy(null)
    }
  }


  return (
    <AuthShell
      topLink={
        <>
          {t("au.newHere")}{" "}
          <Link href={`/signup${nextQuery}`} className={topLinkClass}>
            {t("au.createAccount")}
          </Link>
        </>
      }
      icon={<Route className="h-5 w-5" />}
      eyebrow={t("au.loginEyebrow")}
      title={t("au.loginTitle")}
      subtitle={t("au.loginSub")}
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
              label={t("au.email")}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <PasswordField
              id="password"
              label={t("au.password")}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("au.pwPh")}
              aside={
                <button
                  type="button"
                  onClick={forgotPassword}
                  disabled={busy !== null}
                  className="text-sm font-semibold text-[#1d4466] hover:underline underline-offset-4"
                >
                  {busy === "reset" ? t("au.sending") : t("au.forgot")}
                </button>
              }
            />
            {error && <Notice tone="error">{msg(error)}</Notice>}
            {info && <Notice>{msg(info)}</Notice>}
            <SubmitButton busy={busy === "email"}>{t("nav.signIn")}</SubmitButton>
          </form>

          <Divider>{t("au.divider")}</Divider>
          <AltMethods
            next={next}
            onGoogle={() => signInWithProvider("google")}
            onApple={() => signInWithProvider("apple")}
            appleBusy={busy === "apple"}
            googleBusy={busy === "google"}
            disabled={busy !== null}
          />
        </>
      )}
      <Terms />
    </AuthShell>
  )
}
