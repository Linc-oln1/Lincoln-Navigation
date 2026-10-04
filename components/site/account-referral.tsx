import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"
import { CopyReferral } from "@/components/site/copy-referral"
import { T } from "@/components/i18n/rich-text"

/** "Invite friends" card on /account: your code, share link and how many joined. */
export async function AccountReferral({ userId }: { userId: string }) {
  if (!ADMIN_ENABLED) return null
  const admin = createAdminClient()
  const [{ data: me }, { count }] = await Promise.all([
    admin.from("profiles").select("referral_code, pro_until").eq("id", userId).maybeSingle(),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId),
  ])
  if (!me?.referral_code) return null

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4">
      <h2 className="m-0 text-sm font-semibold">
        <T k="ac.refTitle" />
      </h2>
      <p className="mt-1.5 text-xs text-muted-foreground">
        <T k="ac.refBody" />
      </p>
      <CopyReferral code={me.referral_code} />
      <p className="mt-3 text-xs text-muted-foreground">
        <T k="ac.refCount" params={{ n: count ?? 0 }} />
      </p>
      {me.pro_until && Date.parse(me.pro_until) > Date.now() && (
        <p className="mt-1 text-xs font-semibold text-primary">
          <T k="ac.refProUntil" params={{ date: new Date(me.pro_until).toISOString().slice(0, 10) }} />
        </p>
      )}
    </section>
  )
}
