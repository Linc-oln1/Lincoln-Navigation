import { notFound } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { SponsorsAdmin } from "@/components/admin/sponsors-admin"

export const metadata = { title: "Sponsors — Admin", robots: { index: false } }

export default async function AdminSponsorsPage() {
  // Anyone who isn't an admin (including signed-out visitors) sees a
  // plain 404 — the page doesn't advertise that it exists.
  if (!(await getAdminUser())) notFound()

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-14">
        <h1 className="m-0 mt-8 text-3xl font-extrabold tracking-tight">Sponsored places</h1>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          Approve paid listings, extend renewals, and see what each sponsor got.
        </p>
        <SponsorsAdmin />
      </div>
      <SiteFooter />
    </main>
  )
}
