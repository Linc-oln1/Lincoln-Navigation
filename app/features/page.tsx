import { Playfair_Display } from "next/font/google"
import { FeaturesExperience } from "@/components/features/features-experience"
import { SiteFooter } from "@/components/site/site-footer"

const display = Playfair_Display({ subsets: ["latin"], weight: ["400", "500"], display: "swap" })

export const metadata = {
  title: "Features — Discover Ghana with Lincoln Navigation",
  description:
    "Castles, canopy walks, waterfalls and wildlife — explore Ghana's best-loved places and get turn-by-turn routes to every one of them.",
}

export default function FeaturesPage() {
  return (
    <main>
      <FeaturesExperience displayFont={display.className} />
      <SiteFooter />
    </main>
  )
}
