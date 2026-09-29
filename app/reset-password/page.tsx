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
} from "@/components/auth/auth-shell"

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
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.")
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else router.replace("/app")
  }

  return (
    <AuthShell
      topLink={
        <Link href="/login" className={topLinkClass}>
          Back to sign in
        </Link>
      }
      icon={<KeyRound className="h-5 w-5" />}
      eyebrow="Almost there"
      title="Set a new password"
      subtitle="Choose a password you'll use to sign in from now on."
    >
      {loading ? null : !user ? (
        <Notice>
          Open the reset link from your email to set a new password. Links
          expire after a while — you can request a fresh one from{" "}
          <Link href="/login" className="font-semibold underline">sign in</Link>.
        </Notice>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <PasswordField
            id="password"
            label="New password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          {error && <Notice tone="error">{error}</Notice>}
          <SubmitButton busy={busy}>Save password</SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
