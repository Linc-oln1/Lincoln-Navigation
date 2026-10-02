import { preconnect, preload } from "react-dom"
import { pageMeta } from "@/lib/page-meta"
import { VECTOR_STYLE_URL } from "@/lib/map-style"

// The map page is a client component, so its metadata lives here.
export const metadata = pageMeta({
  title: "Live map — Lincoln Navigation",
  description:
    "The live map of Ghana: search places, get directions by car, trotro, moto, bike or on foot, and see weather and road hazards along the way.",
  path: "/app",
})

export default function MapLayout({ children }: { children: React.ReactNode }) {
  // The map can't draw until its style JSON arrives, and MapView only asks
  // for it after its own code has loaded. Start that request (and the
  // connection the tiles reuse) with the page instead.
  preconnect(new URL(VECTOR_STYLE_URL).origin, { crossOrigin: "anonymous" })
  preload(VECTOR_STYLE_URL, { as: "fetch", crossOrigin: "anonymous" })
  return children
}
