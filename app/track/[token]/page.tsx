import type { Metadata } from "next"
import { TrackView } from "@/components/track/track-view"

export const metadata: Metadata = {
  title: "Live location — Lincoln Navigation",
  robots: { index: false, follow: false },
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <TrackView token={token} />
}
