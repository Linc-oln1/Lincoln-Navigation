import type { MessageKey } from "@/lib/i18n/messages"

export interface NavLink {
  labelKey: MessageKey
  href: string
}

/** Top bar links. */
export const HEADER_LINKS: NavLink[] = [
  { labelKey: "nav.map", href: "/app" },
  { labelKey: "nav.pricing", href: "/pricing" },
  { labelKey: "nav.about", href: "/about" },
  { labelKey: "nav.advertise", href: "/advertise" },
  { labelKey: "nav.contact", href: "/contact" },
]

/** Footer columns — every public page appears in exactly one group. */
export const FOOTER_GROUPS: { titleKey: MessageKey; links: NavLink[] }[] = [
  {
    titleKey: "footer.product",
    links: [
      { labelKey: "nav.liveMap", href: "/app" },
      { labelKey: "nav.pricing", href: "/pricing" },
    ],
  },
  {
    titleKey: "footer.company",
    links: [
      { labelKey: "nav.about", href: "/about" },
      { labelKey: "nav.advertise", href: "/advertise" },
      { labelKey: "nav.contact", href: "/contact" },
    ],
  },
  {
    titleKey: "footer.legal",
    links: [
      { labelKey: "footer.privacy", href: "/privacy" },
      { labelKey: "footer.terms", href: "/terms" },
    ],
  },
  {
    titleKey: "footer.account",
    links: [
      { labelKey: "nav.signIn", href: "/login" },
      { labelKey: "nav.myAccount", href: "/account" },
    ],
  },
]
