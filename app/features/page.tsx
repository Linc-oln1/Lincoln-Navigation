import { Playfair_Display } from "next/font/google"
import { FeaturesExperience } from "@/components/features/features-experience"
import { SiteFooter } from "@/components/site/site-footer"
import { pageMeta } from "@/lib/page-meta"

const display = Playfair_Display({ subsets: ["latin"], weight: ["400", "500"], display: "swap" })

export const metadata = pageMeta({
  title: "Features — Discover Ghana with Lincoln Navigation",
  description:
    "Castles, canopy walks, waterfalls and wildlife — explore Ghana's best-loved places and get turn-by-turn routes to every one of them.",
  path: "/features",
  image: {
    url: "/features/opengraph-image.jpg",
    alt: "Find your way to Ghana's wonders — castles, canopy walks, waterfalls and wildlife",
  },
})

export default function FeaturesPage() {
  return (
    <main>
      <FeaturesExperience displayFont={display.className} />
      <SiteFooter />
    </main>
  )
}
