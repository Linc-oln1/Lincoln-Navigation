"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePremium } from "@/hooks/use-premium"
import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"

interface Subscription {
  plan: "premium" | "pro"
  status: string
  nextPaymentAt: string | null
  cardBrand: string | null
  cardLast4: string | null
}

/**
 * The signed-in user's plan: when it renews and with which card (cancel /
 * change card), plus a way to get a paid plan back on this device.
 */
export function AccountPlanRow() {
  const { isPremium, isPro, expiresAt } = usePremium()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [subBusy, setSubBusy] = useState<"cancel" | "manage" | null>(null)
  const [subError, setSubError] = useState(false)
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState("")
  const [busy, setBusy] = useState(false)
  // Kept as a key so it follows a language switch.
  const [message, setMessage] = useState<{ k: MessageKey; p?: Record<string, string> } | null>(null)
  const { t, lang } = useI18n()

  const plan = isPro ? "Pro" : isPremium ? "Premium" : t("ac.planFree")
  const until = expiresAt ? new Date(expiresAt).toLocaleDateString(lang) : null
  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000) : null

  const loadSub = useCallback(() => {
    fetch("/api/billing/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSub(data?.subscription ?? null))
      .catch(() => {})
  }, [])
  useEffect(loadSub, [loadSub])

  const renewing = sub?.status === "active"
  const failed = sub?.status === "attention"
  const stopped = Boolean(sub) && !renewing && !failed
  const subPlan = sub?.plan === "pro" ? "Pro" : "Premium"
  const renewOn = sub?.nextPaymentAt ? new Date(sub.nextPaymentAt).toLocaleDateString(lang) : until
  const card =
    sub?.cardLast4 ? t("ac.card", { brand: cap(sub.cardBrand?.trim() || t("ac.cardWord")), last4: sub.cardLast4 }) : null

  async function subAction(action: "cancel" | "manage") {
    if (action === "cancel" && !window.confirm(t("ac.cancelConfirm", { plan: subPlan, date: until ?? "" }))) return
    setSubBusy(action)
    setSubError(false)
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error()
      if (action === "manage" && data?.url) {
        window.location.href = data.url
        return
      }
      window.dispatchEvent(new Event("focus")) // usePremium re-reads the cookie
      loadSub()
    } catch {
      setSubError(true)
    }
    setSubBusy(null)
  }

  async function restore(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/billing/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reference.trim() ? { reference: reference.trim() } : {}),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 429) setMessage({ k: "ac.tooMany" })
      else if (!res.ok) setMessage({ k: "ac.cantCheck" })
      else if (data?.restored) {
        setMessage({ k: "ac.restored", p: { plan: data.plan === "pro" ? "Pro" : "Premium" } })
        window.dispatchEvent(new Event("focus")) // usePremium re-reads the cookie
      } else {
        setMessage({ k: reference.trim() ? "ac.noRef" : "ac.noPlan" })
        setOpen(true)
      }
    } catch {
      setMessage({ k: "ac.cantCheck" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <dt className="text-sm text-muted-foreground">{t("ac.plan")}</dt>
        <dd className="text-right">
          <span className="text-sm font-medium">{plan}</span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isPremium && renewing && renewOn ? (
              <>
                {t("ac.renews", { date: renewOn })}
                {card ? ` · ${card}` : ""}
              </>
            ) : isPremium ? (
              <>
                {until ? t("ac.activeUntil", { date: until }) : t("ac.active")}
                {daysLeft !== null && daysLeft <= 7
                  ? ` (${daysLeft <= 0 ? t("ac.endsToday") : daysLeft === 1 ? t("ac.dayLeft") : t("ac.daysLeft", { n: daysLeft })})`
                  : ""}
                .
              </>
            ) : (
              <>
                {t("ac.upgrade")}{" "}
                <Link href="/pricing" className="font-semibold text-primary hover:underline">
                  {t("ac.seePlans")}
                </Link>
              </>
            )}
          </p>
        </dd>
      </div>

      {sub && (renewing || failed) && (
        <div className="mt-3 border-t border-border pt-3">
          {failed && (
            <p className="mb-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs">{t("ac.payFailed", { plan: subPlan })}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => subAction("manage")}
              disabled={subBusy !== null}
              className={
                failed
                  ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  : "rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/70 disabled:opacity-60"
              }
            >
              {subBusy === "manage" ? t("ac.opening") : t("ac.updateCard")}
            </button>
            <button
              type="button"
              onClick={() => subAction("cancel")}
              disabled={subBusy !== null}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/70 hover:text-foreground disabled:opacity-60"
            >
              {subBusy === "cancel" ? t("ac.checking") : t("ac.cancelRenew")}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{t("ac.cancelHint")}</p>
          {subError && <p role="status" className="mt-2 text-xs text-muted-foreground">{t("ac.subError")}</p>}
        </div>
      )}

      {isPremium && stopped && (
        <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs">
          {t("ac.cancelled", { date: until ?? "" })}{" "}
          <Link href="/pricing" className="font-semibold text-primary hover:underline">
            {t("ac.resubscribe")}
          </Link>
        </p>
      )}

      {isPremium && !sub && daysLeft !== null && daysLeft <= 7 && (
        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs">
          {t("ac.endsSoon")}{" "}
          <Link href="/pricing" className="font-semibold text-primary hover:underline">
            {t("ac.renew")}
          </Link>
          .
        </p>
      )}

      {!isPremium && (
        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => restore()}
            disabled={busy}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/70 disabled:opacity-60"
          >
            {busy ? t("ac.checking") : t("ac.restore")}
          </button>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {t("ac.restoreHint")}
          </p>
          <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 text-[11px] font-semibold text-primary hover:underline">
            {t("ac.diffEmail")}
          </button>
          {open && (
            <form onSubmit={restore} className="mt-2 flex gap-2">
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={t("ac.refPh")}
                className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-xs outline-none focus:border-primary"
              />
              <button type="submit" disabled={busy || !reference.trim()} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                {t("ac.restoreBtn")}
              </button>
            </form>
          )}
          {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{t(message.k, message.p)}</p>}
        </div>
      )}
    </div>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
