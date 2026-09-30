"use client"

// Landing page for the "Forgot password?" email. /auth/callback has
// already exchanged the link's code for a session, so the user just
// picks a new password here.

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { KeyRound } from "lucide-react"
import { useSession } from "@/hooks/use-session"
import { createClient } from "@/lib/supabase/client"
import {
  AuthShell,
  Notice,
  PasswordField,
  SubmitButton,
  topLinkClass,
  useAuthMsg,
  type AuthMsg,
} from "@/components/auth/auth-shell"
import { useI18n } from "@/components/i18n/language-provider"
import { fillNodes } from "@/components/i18n/rich-text"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f1efe7]" />}>
      <ResetContent />
    </Suspense>
  )
}

function ResetContent() {
  const router = useRouter()
  const { user, loading } = useSession()
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthMsg | null>(null)
  const { t } = useI18n()
  const msg = useAuthMsg()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError({ k: "au.errShort" })
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.updateUser({ password })
    setBusy(false)
    if (error) setError({ raw: error.message })
    else router.replace("/app")
  }

  return (
    <AuthShell
      topLink={
        <Link href="/login" className={topLinkClass}>
          {t("au.backToSignIn")}
        </Link>
      }
      icon={<KeyRound className="h-5 w-5" />}
      eyebrow={t("au.resetEyebrow")}
      title={t("au.resetTitle")}
      subtitle={t("au.resetSub")}
    >
      {loading ? null : !user ? (
        <Notice>
          {fillNodes(t("au.openLink"), {
            signIn: (
              <Link href="/login" className="font-semibold underline">
                {t("au.signInLower")}
              </Link>
            ),
          })}
        </Notice>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <PasswordField
            id="password"
            label={t("au.newPw")}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("au.pwNewPh")}
          />
          {error && <Notice tone="error">{msg(error)}</Notice>}
          <SubmitButton busy={busy}>{t("au.savePw")}</SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
