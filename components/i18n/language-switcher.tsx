"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { LANGUAGES } from "@/lib/i18n/languages"
import { useI18n } from "@/components/i18n/language-provider"

/** Globe button + language list. Colours come from the caller's theme. */
export function LanguageSwitcher({
  buttonClass,
  menuClass,
  align = "right",
  showLabel = false,
}: {
  buttonClass?: string
  menuClass?: string
  align?: "left" | "right"
  showLabel?: boolean
}) {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`${t("nav.language")}: ${current.english}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition-colors",
          buttonClass,
        )}
      >
        <Globe className="h-4 w-4" aria-hidden />
        {showLabel && <span>{current.name}</span>}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("nav.language")}
          className={cn(
            "absolute top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border py-1 shadow-xl",
            align === "right" ? "right-0" : "left-0",
            menuClass ?? "border-border bg-card text-foreground",
          )}
        >
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                type="button"
                onClick={() => {
                  setLang(l.code)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-black/10 dark:hover:bg-white/10"
              >
                <span dir={l.dir}>{l.name}</span>
                {l.code === lang && <Check className="h-4 w-4" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
