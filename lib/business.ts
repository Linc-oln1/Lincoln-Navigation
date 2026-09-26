import {
  Truck,
  Package,
  CarTaxiFront,
  Smartphone,
  Bus,
  ShieldCheck,
  Landmark,
  Factory,
  GraduationCap,
  Code,
  Route,
  type LucideIcon,
} from "lucide-react"

/** Where business enquiries are sent (the same address as the Contact page). */
export const BUSINESS_EMAIL = "info@lincolnnavigation.com"

export interface BusinessSegment {
  id: string
  /** Shown on the card and in the enquiry form's dropdown. */
  title: string
  icon: LucideIcon
  body: string
  /** Two short chips shown on the featured card. */
  highlights: [string, string]
}

/*
 * Copy here describes what the navigation already does — routing for
 * five travel modes, live turn-by-turn with automatic rerouting, live ETA,
 * Ghana place search, hazard-aware routes, Live View and 16 languages —
 * and offers to build the rest with each partner. It deliberately does
 * not promise features that don't exist yet (fleet dashboards, an
 * self-serve API, etc.).
 */
export const BUSINESS_SEGMENTS: BusinessSegment[] = [
  {
    id: "logistics",
    title: "Logistics companies",
    icon: Truck,
    body: "Plan and follow long-haul and city routes across Ghana, with live ETAs and automatic rerouting when a driver leaves the route.",
    highlights: ["Live ETA", "Auto rerouting"],
  },
  {
    id: "delivery",
    title: "Delivery companies",
    icon: Package,
    body: "Navigation for riders on motorbikes and bicycles and couriers on foot — footpath-aware routes, turn-by-turn, and hazard-aware warnings.",
    highlights: ["Bike & foot routes", "Hazard warnings"],
  },
  {
    id: "taxi",
    title: "Taxi companies",
    icon: CarTaxiFront,
    body: "Give drivers clear turn-by-turn guidance in their own language, so any driver can find any address in the country.",
    highlights: ["Local-language guidance", "Any address"],
  },
  {
    id: "ride-hailing",
    title: "Ride-hailing companies",
    icon: Smartphone,
    body: "Routing, live ETA and Ghana-first place search as building blocks for your driver and rider apps.",
    highlights: ["Routing building blocks", "Place search"],
  },
  {
    id: "bus",
    title: "Bus companies",
    icon: Bus,
    body: "Route guidance for bus and trotro drivers. Tell us about your lines and stops and we'll work out how to support them.",
    highlights: ["Route guidance", "Built with your lines"],
  },
  {
    id: "insurance",
    title: "Insurance companies",
    icon: ShieldCheck,
    body: "Road-hazard context — flood-prone areas, poor road surfaces, crashes — to inform risk, journey and claims decisions.",
    highlights: ["Flood-risk forecasts", "Road-hazard context"],
  },
  {
    id: "government",
    title: "Government agencies",
    icon: Landmark,
    body: "Maps, road-hazard and flood-warning layers and multilingual navigation that public services and their citizens can rely on.",
    highlights: ["Hazard layers", "Multilingual maps"],
  },
  {
    id: "automotive",
    title: "Automotive companies",
    icon: Factory,
    body: "Ghana-first navigation you can bring into vehicles, dealer apps and connected-car projects.",
    highlights: ["Ghana-first maps", "Embeddable"],
  },
  {
    id: "universities",
    title: "Universities",
    icon: GraduationCap,
    body: "Campus and city maps, research partnerships, and a real-world platform for student and staff projects.",
    highlights: ["Campus & city maps", "Research partners"],
  },
  {
    id: "developers",
    title: "Developers",
    icon: Code,
    body: "Routing, geocoding and place search for Ghana in one place. Join the early-access list and tell us what you're building.",
    highlights: ["Early access", "Ghana-first data"],
  },
  {
    id: "fleets",
    title: "Fleet operators",
    icon: Route,
    body: "Put every driver on the same routes with live turn-by-turn, live ETA and automatic rerouting — on the phones they already carry.",
    highlights: ["Same routes for all", "Turn-by-turn"],
  },
]

export const BUSINESS_CAPABILITIES = [
  "Routing for driving, motorcycle, bus, walking and cycling",
  "Live turn-by-turn with automatic rerouting and live ETA",
  "Ghana address and place search",
  "Hazard-aware routes, including flood-risk forecasts",
  "Live View camera navigation",
  "16 languages, including Twi",
]

export const BUSINESS_INTERESTS = [
  "Routing",
  "Live navigation & ETA",
  "Live View",
  "Hazard & flood data",
  "Integration or early API access",
]

export const BUSINESS_SIZES = [
  "Just exploring",
  "Pilot (up to 10 vehicles or users)",
  "10 – 100",
  "100 – 1,000",
  "1,000+",
]
