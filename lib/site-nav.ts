export interface NavLink {
  label: string
  href: string
}

/** Top bar links. */
export const HEADER_LINKS: NavLink[] = [
  { label: "Map", href: "/app" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Advertise", href: "/advertise" },
  { label: "Contact", href: "/contact" },
]

/** Footer columns — every public page appears in exactly one group. */
export const FOOTER_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Live map", href: "/app" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Advertise", href: "/advertise" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "My account", href: "/account" },
    ],
  },
]
