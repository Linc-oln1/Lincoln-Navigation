export type SiteVariant = "app" | "gold" | "light"

/** Colour classes for the shared header and footer, per page theme. */
export const SITE_THEME: Record<
  SiteVariant,
  {
    bar: string
    border: string
    text: string
    muted: string
    hover: string
    active: string
    pill: string
    menu: string
  }
> = {
  app: {
    bar: "bg-background",
    border: "border-border",
    text: "text-foreground",
    muted: "text-muted-foreground",
    hover: "hover:text-foreground",
    active: "text-foreground font-semibold",
    pill: "bg-primary text-primary-foreground",
    menu: "bg-card border-border",
  },
  gold: {
    bar: "bg-[#0d0d0d]",
    border: "border-[#c9a06e]/15",
    text: "text-white",
    muted: "text-neutral-500",
    hover: "hover:text-[#d9b98c]",
    active: "text-[#d9b98c] font-semibold",
    pill: "bg-[#c9a06e] text-[#1a1206]",
    menu: "bg-[#161310] border-[#c9a06e]/15",
  },
  light: {
    bar: "bg-transparent",
    border: "border-black/10",
    text: "text-neutral-950",
    muted: "text-neutral-700",
    hover: "hover:text-black",
    active: "text-black font-semibold",
    pill: "bg-[#1c1c1c] text-white",
    menu: "bg-white border-black/10",
  },
}
