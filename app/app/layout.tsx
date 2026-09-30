import { pageMeta } from "@/lib/page-meta"

// The map page is a client component, so its metadata lives here.
export const metadata = pageMeta({
  title: "Live map — Lincoln Navigation",
  description:
    "The live map of Ghana: search places, get directions by car, trotro, moto, bike or on foot, and see weather and road hazards along the way.",
  path: "/app",
})

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children
}
