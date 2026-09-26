"use client"

import { useI18n } from "@/components/i18n/language-provider"

import { X, Navigation, Share2, Star, MapPin, Phone, Globe, Clock, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePremium } from "@/hooks/use-premium"
import { openStatus } from "@/lib/opening-hours"

interface LocationDetailsProps {
  location: {
    name: string
    address: string
    lat: number
    lng: number
    type?: string
    sponsored?: boolean
    url?: string
    phone?: string
    website?: string
    openingHours?: string
    cuisine?: string
  } | null
  isFavorite?: boolean
  onToggleFavorite?: () => void
  onClose: () => void
  onGetDirections: () => void
}

export function LocationDetails({
  location,
  isFavorite = false,
  onToggleFavorite,
  onClose,
  onGetDirections,
}: LocationDetailsProps) {
  const { t } = useI18n()
  const { isPremium } = usePremium()
  if (!location) return null

  const status = openStatus(location.openingHours)
  const hasBusinessInfo = Boolean(location.openingHours || location.phone || location.website)

  const handleShare = async () => {
    const url = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: location.name,
          text: `Check out ${location.name}`,
          url: url,
        })
      } catch (error) {
        console.log("[v0] Share cancelled or failed")
      }
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-[380px] bg-card/95 backdrop-blur-xl z-[1001] border border-border rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground truncate">{location.name}</h2>
              {location.sponsored && (
                <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/40 rounded px-1 py-0.5">
                  {t("places.sponsored")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
            {location.type && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full capitalize">
                {location.type}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
            aria-label={t("loc.closeDetails")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-3">
          <Button 
            onClick={onGetDirections}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Navigation className="w-4 h-4 mr-2" />
            {t("dir.title")}
          </Button>
          <Button
            variant="secondary"
            onClick={handleShare}
            className="px-4"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? t("loc.removeFav") : t("loc.saveFav")}
            className="px-4"
          >
            <Star className={cn("w-4 h-4", isFavorite && "fill-current text-primary")} />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-foreground">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
        </div>
        {isPremium && location.openingHours && (
          <div className="flex items-start gap-3 text-sm">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div>
              {status.state === "open" && (
                <p className="font-semibold text-green-500">
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
                </p>
              )}
              {status.state === "closed" && (
                <p className="font-semibold text-red-400">
                  {t("biz.closed")}
                  {status.opensAt && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      · {t("biz.opensAt", { time: status.opensAt })}
                    </span>
                  )}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{location.openingHours}</p>
            </div>
          </div>
        )}
        {isPremium && location.phone && (
          <a
            href={`tel:${location.phone.replace(/[^+\d]/g, "")}`}
            className="flex items-center gap-3 text-sm text-primary hover:underline"
          >
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{location.phone}</span>
          </a>
        )}
        {isPremium && location.website && (
          <a
            href={/^https?:\/\//i.test(location.website) ? location.website : `https://${location.website}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center gap-3 text-sm text-primary hover:underline"
          >
            <Globe className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{t("biz.website")}</span>
          </a>
        )}
        {!isPremium && hasBusinessInfo && (
          <a
            href="/pricing"
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2 text-xs text-primary transition-colors hover:bg-primary/10"
          >
            <Lock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            {t("biz.premiumHint")}
          </a>
        )}
        {location.url && (
          <a
            href={location.url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="flex items-center gap-3 text-sm text-primary hover:underline"
          >
            <Globe className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{t("loc.website")}</span>
          </a>
        )}
      </div>

      {/* Quick info */}
      <div className="px-4 pb-4">
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">
            {t("loc.hint")}
          </p>
        </div>
      </div>
    </div>
  )
}
