"use client"

import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"

import { useState, useEffect, useRef } from "react"
import {
  X,
  Utensils,
  Coffee,
  ShoppingBag,
  ShoppingCart,
  Building2,
  Fuel,
  Hotel,
  Landmark,
  TreePine,
  GraduationCap,
  Loader2,
  MapPin,
  CreditCard,
  Pill,
  Hospital,
  ParkingCircle,
  Church,
  Clapperboard,
  Dumbbell,
  Plane,
  TrainFront,
  Ship,
  Phone,
  Globe,
  Lock,
  Star,
  Megaphone,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { searchNearbyPlaces, type Place } from "@/lib/geocoding"
import { usePremium } from "@/hooks/use-premium"
import { openStatus } from "@/lib/opening-hours"
import { getSponsoredPlaces } from "@/lib/sponsored-places"
import { AdSlot } from "@/components/ads/ad-slot"
import { HOUSE_PROMO, HOUSE_PROMO_ENABLED } from "@/lib/monetization"

/*
 * PREVIOUSLY: this panel queried the Overpass API directly from
 * the browser using tag combinations that, for several categories
 * (notably "Shopping"), don't correspond to any real OpenStreetMap
 * tag at all — so those categories always returned zero results
 * and silently showed a FAKE placeholder ("Sample shop") instead.
 * Only point (node) features were queried, so anything mapped as
 * a building/way (most supermarkets, malls, hotels...) was
 * invisible.
 *
 * NOW: category queries go through /api/places, which uses correct
 * tag filters and includes ways/relations too, with an honest
 * "no results" state instead of fabricated data. The category list
 * is also considerably larger so more of what's actually in an
 * area can be found.
 */

interface PlacesPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlace: (place: Place) => void
  mapCenter: [number, number]
}

const CATEGORIES = [
  { id: "restaurant", label: "Restaurants", icon: Utensils },
  { id: "cafe", label: "Cafes", icon: Coffee },
  { id: "shop", label: "Shopping", icon: ShoppingBag },
  { id: "supermarket", label: "Supermarkets", icon: ShoppingCart },
  { id: "bank", label: "Banks", icon: Building2 },
  { id: "atm", label: "ATMs", icon: CreditCard },
  { id: "fuel", label: "Gas Stations", icon: Fuel },
  { id: "hotel", label: "Hotels", icon: Hotel },
  { id: "tourism", label: "Attractions", icon: Landmark },
  { id: "park", label: "Parks", icon: TreePine },
  { id: "university", label: "Universities", icon: GraduationCap },
  { id: "hospital", label: "Hospitals", icon: Hospital },
  { id: "pharmacy", label: "Pharmacies", icon: Pill },
  { id: "parking", label: "Parking", icon: ParkingCircle },
  { id: "place_of_worship", label: "Worship", icon: Church },
  { id: "cinema", label: "Cinemas", icon: Clapperboard },
  { id: "gym", label: "Gyms", icon: Dumbbell },
  { id: "airport", label: "Airports", icon: Plane },
  { id: "train_station", label: "Train stations", icon: TrainFront },
  { id: "ferry_terminal", label: "Ferry terminals & ports", icon: Ship },
] as const

/** Straight-line distance in metres between two [lat, lng] points. */
function metersBetween(a: [number, number], b: [number, number]) {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b[0] - a[0]) / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

function formatMeters(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`
}

/** Prefix a bare phone/website for use in an href. */
function webHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export function PlacesPanel({ isOpen, onClose, onSelectPlace, mapCenter }: PlacesPanelProps) {
  const { t } = useI18n()
  // Advanced business discovery (Premium): hours, phone, website, filters.
  const { isPremium } = usePremium()
  const [filters, setFilters] = useState({ open: false, phone: false, website: false })
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel any in-flight lookup when the panel closes or the
    // map center changes significantly, to avoid stale results
    // landing after a newer request.
    return () => abortControllerRef.current?.abort()
  }, [])

  const searchCategory = async (category: string) => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setSelectedCategory(category)
    setIsLoading(true)
    setError(null)
    setPlaces([])

    try {
      const found = await searchNearbyPlaces(
        category,
        mapCenter,
        10000,
        controller.signal
      )

      if (controller.signal.aborted) return

      setPlaces(found)

      if (found.length === 0) {
        setError(t("places.noneCategory"))
      }
    } catch (err) {
      if (controller.signal.aborted) return

      // The free public Overpass API this route proxies to is
      // known to return occasional 5xx errors under load — a
      // real-world condition, not a code defect, and one the UI
      // already surfaces properly via setError() below. console.error
      // trips Next's dev overlay as a blocking "Console Error" for
      // something that's already handled gracefully, so this stays
      // a warn (still visible for debugging, just not disruptive).
      console.warn("Places search error:", err)
      setError(
        err instanceof Error
          ? err.message
          : t("places.loadError")
      )
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }

  // Paid placements for the current category, pinned above organic
  // results. Empty unless a real advertiser is in range (see
  // lib/sponsored-places.ts).
  const sponsored = selectedCategory
    ? getSponsoredPlaces(selectedCategory, mapCenter)
    : []

  // Per-place extras, worked out once per render. Premium sorts nearest first
  // and can filter; free visitors keep the plain list.
  const now = new Date()
  const enriched = places.map((place) => ({
    place,
    status: openStatus(place.openingHours, now),
    meters: metersBetween(mapCenter, [place.lat, place.lng]),
  }))
  const shown = isPremium
    ? enriched
        .filter((e) => !filters.open || e.status.state === "open")
        .filter((e) => !filters.phone || Boolean(e.place.phone))
        .filter((e) => !filters.website || Boolean(e.place.website))
        .sort((a, b) => a.meters - b.meters)
    : enriched
  const hasExtras = places.some((p) => p.openingHours || p.phone || p.website)

  if (!isOpen) return null

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-[400px] bg-card/95 backdrop-blur-xl z-[1001] border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("places.title")}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label={t("places.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* contain: inline-size stops Radix's Viewport (which sizes
            itself like a table cell, shrink-to-fit) from stretching
            to match a result's un-wrapped `truncate` text — without
            it, a long name/address forces the whole panel wider than
            the screen and clips results off the right edge on
            narrow viewports. */}
        <div className="p-4" style={{ contain: "inline-size" }}>
          {/* Categories Grid */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {CATEGORIES.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => searchCategory(id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                  selectedCategory === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center leading-tight">{t(`cat.${id}` as MessageKey)}</span>
              </button>
            ))}
          </div>

          {/* Results */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground">{t("places.loading")}</p>
            </div>
          )}

          {/* Sponsored placements — pinned above organic results,
              clearly labelled. Renders only when a paying advertiser
              is active and in range. */}
          {!isLoading && sponsored.length > 0 && (
            <div className="space-y-2 mb-4">
              {sponsored.map((place) => (
                <button
                  key={place.id}
                  onClick={() => onSelectPlace(place)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-primary/30 bg-primary/[0.06] hover:bg-primary/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const IconComponent =
                        CATEGORIES.find((c) => c.id === place.type)?.icon ??
                        MapPin
                      return <IconComponent className="w-5 h-5 text-primary" />
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {place.name}
                      </p>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/40 rounded px-1 py-0.5 flex-shrink-0">
                        {t("places.sponsored")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {place.address}
                    </p>
                    {place.tagline && (
                      <p className="text-xs text-primary/90 mt-0.5 truncate">
                        {place.tagline}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && selectedCategory && places.length === 0 && sponsored.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {error || t("places.none")}
              </p>
            </div>
          )}

          {!isLoading && places.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {shown.length === places.length
                  ? t("biz.found", { n: places.length })
                  : t("biz.showing", { shown: shown.length, total: places.length })}
              </h3>

              {isPremium ? (
                <div className="mb-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["open", "biz.filterOpen"],
                        ["phone", "biz.filterPhone"],
                        ["website", "biz.filterWebsite"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                        aria-pressed={filters[key]}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          filters[key]
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t(label)}
                      </button>
                    ))}
                  </div>
                  {filters.open && (
                    <p className="text-[11px] text-muted-foreground">{t("biz.filterNote")}</p>
                  )}
                </div>
              ) : (
                hasExtras && (
                  <a
                    href="/pricing"
                    className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2 text-xs text-primary transition-colors hover:bg-primary/10"
                  >
                    <Lock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                    {t("biz.premiumHint")}
                  </a>
                )
              )}

              {shown.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("biz.noMatch")}</p>
              )}

              {shown.map(({ place, status, meters }) => (
                <div key={place.id} className="rounded-lg transition-colors hover:bg-secondary">
                  <button
                    onClick={() => onSelectPlace(place)}
                    className="w-full flex items-start gap-3 p-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {(() => {
                        const IconComponent =
                          CATEGORIES.find((c) => c.id === place.type)?.icon ??
                          MapPin
                        return <IconComponent className="w-5 h-5 text-primary" />
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="font-medium text-foreground truncate">{place.name}</p>
                        {isPremium && (
                          <span className="ml-auto flex-shrink-0 text-xs text-muted-foreground">
                            {formatMeters(meters)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{place.address}</p>
                      {/* Only Google-sourced results carry a rating —
                          the free OSM/Overpass fallback has none, so
                          this quietly doesn't render for those. */}
                      {typeof place.rating === "number" && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-muted-foreground">
                            {place.rating.toFixed(1)}
                            {typeof place.ratingCount === "number" &&
                              ` (${place.ratingCount})`}
                          </span>
                        </div>
                      )}
                      {isPremium && place.cuisine && (
                        <p className="mt-0.5 text-xs capitalize text-muted-foreground">{place.cuisine}</p>
                      )}
                    </div>
                  </button>

                  {isPremium &&
                    (status.state !== "unknown" || place.phone || place.website) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 pb-3 pl-[4.25rem] text-xs">
                        {status.state === "open" && (
                          <span className="font-semibold text-green-500">
                            {status.always ? (
                              t("biz.open24")
                            ) : (
                              <>
                                {t("biz.open")}
                                {status.closesAt && (
                                  <span className="ml-1 font-normal text-muted-foreground">
                                    · {t("biz.closesAt", { time: status.closesAt })}
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                        )}
                        {status.state === "closed" && (
                          <span className="font-semibold text-red-400">
                            {t("biz.closed")}
                            {status.opensAt && (
                              <span className="ml-1 font-normal text-muted-foreground">
                                · {t("biz.opensAt", { time: status.opensAt })}
                              </span>
                            )}
                          </span>
                        )}
                        {place.phone && (
                          <a
                            href={`tel:${place.phone.replace(/[^+\d]/g, "")}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3" aria-hidden />
                            {t("biz.call")}
                          </a>
                        )}
                        {place.website && (
                          <a
                            href={webHref(place.website)}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Globe className="h-3 w-3" aria-hidden />
                            {t("biz.website")}
                          </a>
                        )}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {/* Initial state */}
          {!selectedCategory && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t("places.prompt")}</p>
            </div>
          )}

          {/* House promo — our own ad for the advertising programme.
              Shows for any category with no paid sponsor, so real
              advertisers always take the slot first. Clearly from
              Lincoln Navigation, not labelled "Sponsored". */}
          {!isLoading &&
            selectedCategory &&
            sponsored.length === 0 &&
            HOUSE_PROMO_ENABLED && (
              <a
                href={HOUSE_PROMO.href}
                className="mt-6 flex items-start gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">
                      {HOUSE_PROMO.headline}
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-border rounded px-1 py-0.5 flex-shrink-0">
                      Ad
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {HOUSE_PROMO.body}
                  </p>
                  <p className="text-xs font-semibold text-primary mt-1.5">
                    {HOUSE_PROMO.ctaLabel} →
                  </p>
                </div>
              </a>
            )}

          {/* AdSense unit — parked; renders nothing until configured. */}
          <AdSlot name="placesFooter" className="mt-6" />
        </div>
      </ScrollArea>
    </div>
  )
}
