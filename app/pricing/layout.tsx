import { pageMeta } from "@/lib/page-meta"

// The page itself is a client component, so its metadata lives here.
export const metadata = pageMeta({
  title: "Pricing — Lincoln Navigation",
  description:
    "The map, search and directions are free forever. Premium and Pro add voice navigation, Live View, fleet tools and more — monthly by card, or pay once with Mobile Money.",
  path: "/pricing",
  // Generated (app/pricing/opengraph-image.tsx) so it shows the current price.
  image: {
    url: "/pricing/opengraph-image",
    alt: "Lincoln Navigation pricing — the map is free; Premium and Pro, monthly",
  },
})

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
