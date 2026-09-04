"use client"

interface KineticTypeProps {
  text: string
  className?: string
  delay?: number
  wordDelay?: number
}

/**
 * Splits a headline into words and reveals them left-to-right with
 * a staggered rise + fade — the "kinetic typography" beats the
 * cinematic intro calls for at the end of each act.
 */
export function KineticType({
  text,
  className = "",
  delay = 0,
  wordDelay = 90,
}: KineticTypeProps) {
  const words = text.split(" ")

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="kinetic-word"
          style={{ animationDelay: `${delay + i * wordDelay}ms` }}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  )
}
