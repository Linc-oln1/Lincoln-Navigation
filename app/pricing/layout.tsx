import { pageMeta } from "@/lib/page-meta"

// The page itself is a client component, so its metadata lives here.
export const metadata = pageMeta({
  title: "Pricing — Lincoln Navigation",
  description:
    "The map, search and directions are free forever. Premium and Pro add voice navigation, Live View, fleet tools and more — paid 31 days at a time, no auto-renewal.",
  path: "/pricing",
  // Generated (app/pricing/opengraph-image.tsx) so it shows the current price.
  image: {
    url: "/pricing/opengraph-image",
    alt: "Lincoln Navigation pricing — the map is free; Premium and Pro, 31 days at a time",
  },
})

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
