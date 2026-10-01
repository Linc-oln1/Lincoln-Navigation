// /admin/billing — who's paying: subscribers, monthly revenue, failed
// renewals to chase, and every payment from Paystack in the last 31 days.
// Admins only (ADMIN_EMAILS); everyone else gets a 404. Read-only.

import { notFound } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { getBillingReport } from "@/lib/billing-report"
import { BillingDashboard } from "@/components/admin/billing-dashboard"

export const dynamic = "force-dynamic"
export const metadata = { title: "Billing — Admin", robots: { index: false } }

export default async function AdminBillingPage() {
  const admin = await getAdminUser()
  if (!admin) notFound()
  return <BillingDashboard report={await getBillingReport()} adminEmail={admin.email ?? null} />
}
