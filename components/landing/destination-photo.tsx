"use client"

interface DestinationPhotoProps {
  src: string
  alt: string
  className?: string
}

/**
 * Full-bleed real photograph background for a destination slide —
 * used instead of <DestinationScene> whenever an actual photo is
 * available for that place. Same slow Ken Burns zoom + bottom/left
 * vignette as the illustrated scenes, so the two are interchangeable
 * in the hero without the transition looking inconsistent.
 */
export function DestinationPhoto({ src, alt, className = "" }: DestinationPhotoProps) {
  return (
    <div className={`landing-scene ${className}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
      />
      <div className="landing-scene-vignette" />
    </div>
  )
}
