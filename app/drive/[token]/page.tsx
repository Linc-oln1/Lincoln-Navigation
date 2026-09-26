import type { Metadata } from "next"
import { DriverShare } from "@/components/fleet/driver-share"

export const metadata: Metadata = {
  title: "Share my location — Lincoln Navigation",
  robots: { index: false, follow: false },
}

export default async function DrivePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <DriverShare token={token} />
}
