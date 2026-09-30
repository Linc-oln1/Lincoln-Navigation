import { pageMeta } from "@/lib/page-meta"

// The page itself is a client component, so its metadata lives here.
export const metadata = pageMeta({
  title: "Advertise — Lincoln Navigation",
  description:
    "Put your business in front of people exploring nearby places on Lincoln Navigation — sponsored places for businesses in Ghana.",
  path: "/advertise",
})

export default function AdvertiseLayout({ children }: { children: React.ReactNode }) {
  return children
}
