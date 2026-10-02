// lib/legal.ts
//
// One place for the facts every legal page repeats: who runs the service,
// how to reach them, and when each document last changed. Set the optional
// NEXT_PUBLIC_LEGAL_* variables in your host's environment once you have
// them (registered business name, postal address, Data Protection
// Commission registration number); each line only appears when it is set.

export const SITE_NAME = "LincolnNavigation.com"

/** The person or business legally responsible for the service. */
export const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || "LincolnNavigation.com"

/** Postal address for legal notices. Hidden until set. */
export const LEGAL_ADDRESS = process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || ""

/** Ghana Data Protection Commission registration number. Hidden until set. */
export const DPC_REGISTRATION = process.env.NEXT_PUBLIC_DPC_REGISTRATION?.trim() || ""

export const CONTACT_EMAIL = "info@lincolnnavigation.com"
export const PRIVACY_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || CONTACT_EMAIL
export const SECURITY_EMAIL = process.env.NEXT_PUBLIC_SECURITY_EMAIL?.trim() || CONTACT_EMAIL

/** Bump the matching date whenever a document changes in substance. */
export const LEGAL_UPDATED = {
  privacy: "1 October 2026",
  terms: "1 October 2026",
  cookies: "1 October 2026",
  refunds: "1 October 2026",
  attributions: "27 September 2026",
  advertising: "1 October 2026",
  security: "27 September 2026",
  deleteAccount: "2 October 2026",
} as const

/** Every legal document, in the order the legal pages list them. */
export const LEGAL_DOCS = [
  { href: "/terms", title: "Terms of Service" },
  { href: "/privacy", title: "Privacy Policy" },
  { href: "/cookies", title: "Cookie Policy" },
  { href: "/refunds", title: "Refund Policy" },
  { href: "/advertising-policy", title: "Advertising & Affiliates" },
  { href: "/attributions", title: "Map Data & Attributions" },
  { href: "/security", title: "Security" },
  { href: "/delete-account", title: "Delete Your Account" },
] as const
