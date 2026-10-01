import localFont from "next/font/local"
import { FeaturesExperience } from "@/components/features/features-experience"
import { SiteFooter } from "@/components/site/site-footer"
import { pageMeta } from "@/lib/page-meta"

// Self-hosted (app/fonts, SIL OFL) so builds don't fetch from Google Fonts.
const display = localFont({
  src: [
    { path: "../fonts/playfair-display-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/playfair-display-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
})

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
