import { notFound, redirect } from "next/navigation"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { CopyLink } from "@/components/ambassador/copy-link"
import { PAY_BLOCK_SUBSCRIBERS, PAY_PER_BLOCK_GHS, TARGET_SUBSCRIBERS, TARGET_USERS, statsFor } from "@/lib/ambassadors"
import { AUTH_ENABLED } from "@/lib/supabase/config"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/supabase/server"

export const metadata = { title: "Promoter dashboard — Lincoln Navigation", robots: { index: false } }

export default async function AmbassadorPage() {
  if (!AUTH_ENABLED || !ADMIN_ENABLED) notFound()
  const user = await getSessionUser()
  if (!user) redirect("/login?next=/ambassador")

  const admin = createAdminClient()
  const { data } = await admin.from("profiles").select("is_ambassador").eq("id", user.id).maybeSingle()
  // Not a promoter: the page doesn't advertise that it exists.
  if (!data?.is_ambassador) notFound()
  const s = await statsFor(admin, user.id)
  if (!s) notFound()

  const toNext = PAY_BLOCK_SUBSCRIBERS - (s.subscribers % PAY_BLOCK_SUBSCRIBERS)

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-14">
        <h1 className="m-0 mt-8 text-3xl font-extrabold tracking-tight">Promoter dashboard</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">
          Bring people to Lincoln Navigation with your link. You earn GHS {PAY_PER_BLOCK_GHS.toLocaleString()} for every{" "}
          {PAY_BLOCK_SUBSCRIBERS} verified Premium or Pro subscribers.
        </p>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="m-0 text-sm font-semibold">Your link</h2>
          <CopyLink code={s.code} />
        </section>

        <section className="mt-4 grid gap-4">
          <Meter label="New users" value={s.users} target={TARGET_USERS} hint="Signed up with your link and confirmed their email." />
          <Meter
            label="Premium / Pro subscribers"
            value={s.subscribers}
            target={TARGET_SUBSCRIBERS}
            hint={`Verified payments only. ${toNext} more to your next GHS ${PAY_PER_BLOCK_GHS.toLocaleString()}.`}
          />
        </section>

        <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          <Row label="Earned so far" value={`GHS ${s.earnedGhs.toLocaleString()}`} />
          <Row label="Already paid to you" value={`GHS ${s.paidGhs.toLocaleString()}`} />
          <Row label="Owed to you" value={`GHS ${s.owedGhs.toLocaleString()}`} strong />
        </dl>

        <p className="mt-6 text-xs text-muted-foreground">
          {s.signups - s.users > 0 && `${s.signups - s.users} sign-up(s) haven't confirmed their email yet. `}
          Each person counts once, however many months they pay. Payments are reviewed before payout.
        </p>
      </div>
      <SiteFooter />
    </main>
  )
}

function Meter({ label, value, target, hint }: { label: string; value: number; target: number; hint: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-sm font-semibold">{label}</h2>
        <span className="text-sm font-bold">
          {value} <span className="font-normal text-muted-foreground">/ {target}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 mb-0 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={strong ? "m-0 text-base font-bold" : "m-0 text-sm font-medium"}>{value}</dd>
    </div>
  )
}
