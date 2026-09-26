export type LangCode =
  | "en"
  | "tw"
  | "fr"
  | "es"
  | "ar"
  | "pt"
  | "de"
  | "it"
  | "zh"
  | "hi"
  | "ru"
  | "sw"
  | "ha"
  | "yo"

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
  { code: "ha", name: "Hausa", english: "Hausa", dir: "ltr" },
  { code: "yo", name: "Yorùbá", english: "Yoruba", dir: "ltr" },
  { code: "sw", name: "Kiswahili", english: "Swahili", dir: "ltr" },
  { code: "de", name: "Deutsch", english: "German", dir: "ltr" },
  { code: "it", name: "Italiano", english: "Italian", dir: "ltr" },
  { code: "ru", name: "Русский", english: "Russian", dir: "ltr" },
  { code: "zh", name: "中文", english: "Chinese (Simplified)", dir: "ltr" },
  { code: "hi", name: "हिन्दी", english: "Hindi", dir: "ltr" },
]

export const DEFAULT_LANG: LangCode = "en"
export const LANG_STORAGE_KEY = "ln_lang"

export function isLangCode(value: unknown): value is LangCode {
  return LANGUAGES.some((l) => l.code === value)
}
