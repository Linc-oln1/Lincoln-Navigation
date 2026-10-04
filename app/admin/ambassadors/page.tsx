import Link from "next/link"
import { notFound } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { AmbassadorsAdmin } from "@/components/admin/ambassadors-admin"

export const metadata = { title: "Promoters — Admin", robots: { index: false } }

export default async function AdminAmbassadorsPage() {
  if (!(await getAdminUser())) notFound()

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight">Promoters</h1>
          <Link href="/admin/billing" className="text-sm font-semibold text-primary hover:underline">
            Billing →
          </Link>
        </div>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          Staff who bring in an audience. Target 150 users and 50 paying subscribers; GHS 1,000 per 50 verified Premium/Pro subscribers.
        </p>
        <AmbassadorsAdmin />
      </div>
      <SiteFooter />
    </main>
  )
}
