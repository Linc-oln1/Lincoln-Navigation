"use client"

// The signed-in user's Premium / Pro payments on /account: when, what for,
// the days it covers, the amount and how it was paid, and whether that
// period is active, upcoming (a pay-once top-up bought early) or over.

import { useEffect, useState } from "react"
import { CreditCard, Smartphone, Landmark, Receipt } from "lucide-react"
import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"
import type { PaymentHistoryRow } from "@/lib/plan-store"
import { CONTACT_EMAIL } from "@/lib/legal"
import { cn } from "@/lib/utils"

const ONCE_DAYS_MS = 31 * 86_400_000

const KIND_KEY: Record<string, MessageKey> = {
  monthly: "ac.kind.monthly",
  renewal: "ac.kind.renewal",
  once: "ac.kind.once",
}

function channelInfo(channel: string | null): { key: MessageKey; Icon: typeof CreditCard } {
  if (channel === "card") return { key: "ac.channel.card", Icon: CreditCard }
  if (channel === "mobile_money") return { key: "ac.channel.momo", Icon: Smartphone }
  if (channel === "bank" || channel === "bank_transfer") return { key: "ac.channel.bank", Icon: Landmark }
  return { key: "ac.channel.other", Icon: Receipt }
}

export function AccountPaymentHistory() {
  const { t, lang } = useI18n()
  const [rows, setRows] = useState<PaymentHistoryRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch("/api/billing/history")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { payments?: PaymentHistoryRow[] }) => setRows(data.payments ?? []))
      .catch(() => setFailed(true))
  }, [])

  const date = (iso: string) => new Date(iso).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" })
  const now = Date.now()

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{t("ac.historyTitle")}</h2>

      {failed ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("ac.historyError")}</p>
      ) : rows === null ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("ac.historyLoading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {t("ac.historyEmpty")}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((r) => {
            const end = Date.parse(r.expires_at)
            // A pay-once top-up bought early starts when the previous days run out.
            const start = r.kind === "once" ? end - ONCE_DAYS_MS : Date.parse(r.paid_at)
            const status = now < start ? "upcoming" : now < end ? "active" : "ended"
            const { key: channelKey, Icon } = channelInfo(r.channel)
            const plan = r.plan === "pro" ? "Pro" : "Premium"
            return (
              <li key={r.reference} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {plan} · {t(r.kind ? KIND_KEY[r.kind] : "ac.kind.unknown")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("ac.paidOn", { date: date(r.paid_at) })} ·{" "}
                      {t("ac.covers", { from: date(new Date(start).toISOString()), to: date(r.expires_at) })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {r.amount_pesewas ? `${r.currency ?? "GHS"} ${(r.amount_pesewas / 100).toFixed(2)}` : "—"}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        status === "active" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                        status === "upcoming" && "bg-primary/15 text-primary",
                        status === "ended" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {status === "active" ? t("ac.statusActive") : status === "upcoming" ? t("ac.statusUpcoming") : t("ac.statusEnded")}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {t(channelKey)} · {t("ac.ref", { ref: r.reference })}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted-foreground">{t("ac.receiptNote", { email: CONTACT_EMAIL })}</p>
    </section>
  )
}
