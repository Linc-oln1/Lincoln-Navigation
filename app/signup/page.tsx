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
  useAuthMsg,
  useNextParam,
  type AuthMsg,
} from "@/components/auth/auth-shell"
import { useI18n } from "@/components/i18n/language-provider"
import { fillNodes } from "@/components/i18n/rich-text"
import { isNativeApp, startOAuth } from "@/lib/native"

type Busy = null | "google" | "apple" | "email"

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
  const { t } = useI18n()
  const msg = useAuthMsg()

  useEffect(() => {
    if (user) router.replace(next)
  }, [user, next, router])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState<Busy>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<AuthMsg | null>(null)

  const nextQuery = next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError({ k: "au.errShort" })
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
      setError({ raw: error.message })
      return
    }
    // With email confirmation on, there's no session until they click the link.
    if (data.session) router.replace(next)
    else setSent(true)
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
          {t("au.haveAccount")}{" "}
          <Link href={`/login${nextQuery}`} className={topLinkClass}>
            {t("nav.signIn")}
          </Link>
        </>
      }
      icon={<Navigation className="h-5 w-5" />}
      eyebrow={t("au.signupEyebrow")}
      title={t("au.signupTitle")}
      subtitle={t("au.signupSub")}
    >
      {!AUTH_ENABLED ? (
        <Notice>
          Sign-up isn&rsquo;t available yet — the Supabase project needs to be
          connected (see docs/SUPABASE_SETUP.md).
        </Notice>
      ) : sent ? (
        <Notice title={t("au.checkEmail")}>
          {fillNodes(t("au.confirmSent"), { email: <strong>{email}</strong> })}
        </Notice>
      ) : (
        <>
          <form onSubmit={signUp} className="space-y-6">
            <Field
              label={t("au.fullName")}
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("au.namePh")}
            />
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("au.pwNewPh")}
            />
            {error && <Notice tone="error">{msg(error)}</Notice>}
            <SubmitButton busy={busy === "email"}>{t("au.createAccount")}</SubmitButton>
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
