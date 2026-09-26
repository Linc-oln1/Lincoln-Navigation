import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { BusinessExperience } from "@/components/business/business-experience"

export const metadata = {
  title: "For business — Lincoln Navigation",
  description:
    "Ghana-first navigation for logistics, delivery, taxi, ride-hailing, bus, insurance, government, automotive, university, developer and fleet customers.",
}

export default function BusinessPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-clip bg-[#dcd9d4] text-slate-900">
      {/* Soft grey-scale backdrop, like a hazy mountain range behind the frame */}
      <div className="pointer-events-none fixed inset-0 -z-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/photos/monument.jpg"
          alt=""
          className="h-full w-full scale-110 object-cover opacity-40 blur-[3px] grayscale"
        />
        <div className="absolute inset-0 bg-[#e6e3de]/70" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <SiteHeader variant="light" />
        <div className="flex-1">
          <BusinessExperience />
        </div>
        <SiteFooter variant="light" />
      </div>
    </main>
  )
}
