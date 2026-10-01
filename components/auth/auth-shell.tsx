"use client"

// Shared split-screen layout for /login, /signup and /reset-password:
// a photo panel on the left (no scrim or gradient over it) and a calm
// cream form column on the right.

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import localFont from "next/font/local"
import { ArrowRight, Compass, Eye, EyeOff, Loader2, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n/language-provider"
import { fillNodes } from "@/components/i18n/rich-text"
import type { MessageKey } from "@/lib/i18n/messages"

// Self-hosted variable fonts (app/fonts, SIL OFL) so builds don't fetch
// from Google Fonts.
const serif = localFont({
  src: [
    { path: "../../app/fonts/lora-latin-wght-normal.woff2", weight: "400 700", style: "normal" },
    { path: "../../app/fonts/lora-latin-wght-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-auth-serif",
  display: "swap",
})
const sans = localFont({
  src: "../../app/fonts/dm-sans-latin-wght-normal.woff2",
  weight: "100 1000",
  style: "normal",
  variable: "--font-auth-sans",
  display: "swap",
})

const YEAR = new Date().getFullYear()

/** ?next=… restricted to same-site paths. */
export function useNextParam() {
  const params = useSearchParams()
  const raw = params.get("next") || "/app"
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app"
}

/**
 * A message to show on an auth screen: a translation key (re-translated on
 * every render, so it follows a language switch) or raw text from the auth
 * service, which comes in English.
 */
export type AuthMsg = { k: MessageKey; p?: Record<string, string | number> } | { raw: string }

export function useAuthMsg() {
  const { t } = useI18n()
  return (m: AuthMsg) => ("raw" in m ? m.raw : t(m.k, m.p))
}

export function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
}

export function AuthShell({
  topLink,
  icon,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  topLink: ReactNode
  icon: ReactNode
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <main
      className={cn(
        serif.variable,
        sans.variable,
        "min-h-screen bg-[#f1efe7] p-0 font-[family-name:var(--font-auth-sans)] text-[#1b2b3a] sm:p-4 lg:p-6",
      )}
    >
      <div className="mx-auto flex min-h-screen max-w-[1500px] overflow-hidden bg-[#fdfcf7] shadow-[0_20px_60px_-30px_rgba(27,43,58,0.35)] sm:min-h-[calc(100vh-2rem)] sm:rounded-[28px] lg:min-h-[calc(100vh-3rem)]">
        <PhotoPanel />

        <section className="flex min-w-0 flex-1 flex-col px-6 py-6 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 lg:invisible">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcefe0]"><Compass className="h-[18px] w-[18px]" /></span>
              <span className="text-sm font-semibold">LincolnNavigation</span>
            </Link>
            <p className="text-right text-sm text-[#5b6875]">{topLink}</p>
          </div>

          <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
            <div className="landing-fade-up flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dcefe0] text-[#1b2b3a]">
              {icon}
            </div>
            <p className="landing-fade-up mt-7 text-xs font-semibold uppercase tracking-[0.28em] text-[#5b6875]">
              {eyebrow}
            </p>
            <h1 className="landing-fade-up mt-3 font-[family-name:var(--font-auth-serif)] text-[2.6rem] leading-[1.08] tracking-tight text-[#14263a] sm:text-5xl">
              {title}
            </h1>
            <p className="landing-fade-up mt-4 text-[15px] text-[#5b6875]">{subtitle}</p>

            <div className="landing-fade-up mt-9" style={{ animationDelay: "80ms" }}>
              {children}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[440px] items-center justify-between border-t border-[#e6e2d6] pt-5 text-sm text-[#5b6875]">
            <span>&copy; {YEAR} LincolnNavigation</span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#4caf6e]" />
              {t("au.safeTravels")}
            </span>
          </div>
        </section>
      </div>
    </main>
  )
}

function PhotoPanel() {
  const { t } = useI18n()
  return (
    <aside className="relative hidden w-1/2 shrink-0 overflow-hidden lg:block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/photos/volta.webp"
        alt={t("au.photoAlt")}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative flex h-full flex-col justify-between p-10 text-white [text-shadow:0_1px_14px_rgba(0,0,0,0.45)] xl:p-14">
        <Link href="/" className="flex w-fit items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/15 backdrop-blur-md">
            <Compass className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">LincolnNavigation</span>
        </Link>

        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/35 bg-white/15 px-4 py-2 text-[13px] font-medium uppercase tracking-wide backdrop-blur-md [text-shadow:none]">
            <span className="h-2 w-2 rounded-full bg-[#5fd08a]" />
            {t("au.badge")}
          </span>
          <h2 className="mt-8 font-[family-name:var(--font-auth-serif)] text-6xl leading-[1.05] tracking-tight xl:text-7xl">
            {t("au.heroTitle1")}
            <br />
            <em className="font-normal text-white/85">{t("au.heroTitle2")}</em>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/90">
            {t("au.heroLead")}
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2.5 [text-shadow:none]">
              {["A", "K", "E"].map((l, i) => (
                <span
                  key={l}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 text-xs font-bold",
                    i === 1 ? "bg-[#4caf6e] text-white" : "bg-[#e3f3e7] text-[#1b2b3a]",
                  )}
                >
                  {l}
                </span>
              ))}
            </div>
            <p className="text-white/90">{t("au.heroCurious")}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-white/85">
          <span>&copy; {YEAR} LincolnNavigation</span>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t("au.findOwnWay")}
          </span>
        </div>
      </div>
    </aside>
  )
}

const inputClass =
  "h-14 w-full rounded-2xl border border-[#e6e0c9] bg-[#f8f5e8] px-5 text-[15px] text-[#14263a] outline-none transition-colors placeholder:text-[#9aa2a8] focus:border-[#1d4466]/50 focus:bg-[#fbf9f0] focus:ring-4 focus:ring-[#1d4466]/10"

export function Field({
  label,
  aside,
  ...props
}: { label: string; aside?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-[15px] font-medium text-[#14263a]">
        {label}
        {aside}
      </span>
      <input {...props} className={inputClass} />
    </label>
  )
}

export function PasswordField({
  label,
  aside,
  ...props
}: { label: string; aside?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  const { t } = useI18n()
  return (
    <div>
      <span className="mb-2 flex items-center justify-between text-[15px] font-medium text-[#14263a]">
        <label htmlFor={props.id}>{label}</label>
        {aside}
      </span>
      <div className="relative">
        <input {...props} type={show ? "text" : "password"} className={cn(inputClass, "pr-14")} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t("au.hidePw") : t("au.showPw")}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#4b5a68] transition-colors hover:bg-[#ece7d3]"
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  )
}

export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4466] text-[16px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(29,68,102,0.7)] transition-all hover:bg-[#183a58] active:scale-[0.99] disabled:opacity-70"
    >
      {children}
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  )
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="my-7 flex items-center gap-4 text-sm text-[#5b6875]">
      <span className="h-px flex-1 bg-[#e3dfd2]" />
      {children}
      <span className="h-px flex-1 bg-[#e3dfd2]" />
    </div>
  )
}

export function AltMethods({
  next,
  onGoogle,
  googleBusy,
  disabled,
}: {
  next: string
  onGoogle: () => void
  googleBusy: boolean
  disabled: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onGoogle}
        disabled={disabled}
        className="flex h-12 items-center justify-center gap-2.5 rounded-2xl border border-[#e3dfd2] bg-white text-sm font-medium text-[#14263a] transition-colors hover:bg-[#f8f5e8] disabled:opacity-60"
      >
        {googleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph />}
        Google
      </button>
      <Link
        href={next}
        className="flex h-12 items-center justify-center rounded-2xl border border-[#e3dfd2] bg-white text-sm font-medium text-[#14263a] transition-colors hover:bg-[#f8f5e8]"
      >
        {t("au.guest")}
      </Link>
    </div>
  )
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "error"; title?: string; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[#cfe6d5] bg-[#eef7f0] text-[#1b3a2a]",
      )}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && "mt-1")}>{children}</div>
    </div>
  )
}

const termsLinkClass =
  "font-medium text-[#14263a] underline decoration-[#c9c3ae] underline-offset-4 hover:decoration-[#14263a]"

export function Terms() {
  const { t } = useI18n()
  return (
    <p className="mt-6 text-center text-sm text-[#5b6875]">
      {fillNodes(t("au.agree"), {
        terms: (
          <Link href="/terms" className={termsLinkClass}>
            {t("au.terms")}
          </Link>
        ),
        privacy: (
          <Link href="/privacy" className={termsLinkClass}>
            {t("au.privacy")}
          </Link>
        ),
      })}
    </p>
  )
}

export const topLinkClass = "font-semibold text-[#1d4466] hover:underline underline-offset-4"

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C17.1 3 14.8 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.1-.2-1.6H12z"
      />
    </svg>
  )
}
