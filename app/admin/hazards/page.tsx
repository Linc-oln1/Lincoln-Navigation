import Link from "next/link"
import { notFound } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { HazardsAdmin } from "@/components/admin/hazards-admin"

export const metadata = { title: "Hazards — Admin", robots: { index: false } }

export default async function AdminHazardsPage() {
  // Non-admins (including signed-out visitors) see a plain 404.
  if (!(await getAdminUser())) notFound()

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-14">
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <h1 className="m-0 text-3xl font-extrabold tracking-tight">Hazard reports</h1>
          <Link href="/admin/sponsors" className="text-sm font-semibold text-primary hover:underline">
            Sponsors →
          </Link>
        </div>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          Live reports from the map. Remove anything false or abusive; it disappears from the map straight away.
        </p>
        <HazardsAdmin />
      </div>
      <SiteFooter />
    </main>
  )
}
