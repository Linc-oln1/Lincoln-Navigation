export type LangCode = "en" | "tw" | "fr" | "es" | "ar" | "pt"

export interface Language {
  code: LangCode
  /** Name in its own language, shown in the picker. */
  name: string
  /** English name, for screen readers and search. */
  english: string
  dir: "ltr" | "rtl"
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", english: "English", dir: "ltr" },
  { code: "tw", name: "Twi", english: "Twi (Akan)", dir: "ltr" },
  { code: "fr", name: "Français", english: "French", dir: "ltr" },
  { code: "es", name: "Español", english: "Spanish", dir: "ltr" },
  { code: "ar", name: "العربية", english: "Arabic", dir: "rtl" },
  { code: "pt", name: "Português", english: "Portuguese", dir: "ltr" },
]

export const DEFAULT_LANG: LangCode = "en"
export const LANG_STORAGE_KEY = "ln_lang"

export function isLangCode(value: unknown): value is LangCode {
  return LANGUAGES.some((l) => l.code === value)
}
