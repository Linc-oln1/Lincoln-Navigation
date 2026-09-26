import Link from "next/link"
import { redirect } from "next/navigation"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { getSessionUser } from "@/lib/supabase/server"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { AccountPlanRow } from "@/components/site/account-plan"

export const metadata = { title: "Account — Lincoln Navigation" }

export default async function AccountPage() {
  if (!AUTH_ENABLED) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          Accounts aren&rsquo;t available yet — the Supabase project needs to be
          connected (see docs/SUPABASE_SETUP.md).
        </p>
      </Shell>
    )
  }

  const user = await getSessionUser()
  if (!user) redirect("/login?next=/account")

  return (
    <Shell>
      <dl className="divide-y divide-border rounded-2xl border border-border bg-card">
        <Row label="Signed in as" value={user.email ?? "—"} />
        <AccountPlanRow />
      </dl>

      <form action="/auth/signout" method="post" className="mt-6">
        <button
          type="submit"
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary transition-colors"
        >
          Sign out
        </button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/pricing" className="font-semibold text-primary hover:underline">
          See plans →
        </Link>
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-14">
        <h1 className="m-0 mt-8 mb-8 text-3xl font-extrabold tracking-tight">
          Account
        </h1>
        {children}
      </div>
    <SiteFooter />
    </main>
  )
}

function Row({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right">
        <span className="text-sm font-medium">{value}</span>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </dd>
    </div>
  )
}
