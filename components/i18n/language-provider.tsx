"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  DEFAULT_LANG,
  LANGUAGES,
  LANG_STORAGE_KEY,
  isLangCode,
  type LangCode,
} from "@/lib/i18n/languages"
import { translate, type MessageKey } from "@/lib/i18n/messages"

interface I18n {
  lang: LangCode
  setLang: (lang: LangCode) => void
  t: (key: MessageKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18n>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key, params) => translate(DEFAULT_LANG, key, params),
})

export function useI18n() {
  return useContext(I18nContext)
}

/** Best guess from the browser's language list, e.g. "fr-CA" → "fr". */
function detectLang(): LangCode {
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l?.toLowerCase().split("-")[0]
    if (isLangCode(base)) return base
    if (base === "ak") return "tw" // Akan
  }
  return DEFAULT_LANG
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start on the default so server and first client render match, then
  // switch to the saved / detected language after mount.
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG)

  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(LANG_STORAGE_KEY)
    } catch {}
    setLangState(isLangCode(saved) ? saved : detectLang())
  }, [])

  useEffect(() => {
    const meta = LANGUAGES.find((l) => l.code === lang)
    document.documentElement.lang = lang
    document.documentElement.dir = meta?.dir ?? "ltr"
  }, [lang])

  const setLang = useCallback((next: LangCode) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {}
  }, [])

  const value = useMemo<I18n>(
    () => ({ lang, setLang, t: (key, params) => translate(lang, key, params) }),
    [lang, setLang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
