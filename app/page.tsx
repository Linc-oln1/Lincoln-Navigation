import { LandingPage } from "@/components/landing/landing-page"
import { JsonLd } from "@/components/seo/json-ld"
import { pageMeta } from "@/lib/page-meta"
import { HOME_STRUCTURED_DATA } from "@/lib/structured-data"

// The landing page itself is a client component, so its metadata lives here.
export const metadata = pageMeta({
  title: "Lincoln Navigation — Ghana Maps, Directions & Trotro Routes",
  description:
    "Free maps and turn-by-turn directions for Ghana — by car, trotro, motorbike, bike or on foot. Search places, see road hazards and weather on your route.",
  path: "/",
})

export default function Home() {
  return (
    <>
      <JsonLd data={HOME_STRUCTURED_DATA} />
      <LandingPage />
    </>
  )
}
