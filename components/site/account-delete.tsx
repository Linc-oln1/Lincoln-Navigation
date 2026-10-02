"use client"

import { useState } from "react"
import { useI18n } from "@/components/i18n/language-provider"

/**
 * "Delete account" on /account. Both app stores require deletion inside the
 * app; the user types DELETE to confirm, then /api/account/delete runs.
 */
export function AccountDelete() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || t("ac.deleteError"))
      window.location.href = "/?deleted=1"
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ac.deleteError"))
      setBusy(false)
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-destructive/30 p-4">
      <h2 className="m-0 text-sm font-semibold">{t("ac.deleteTitle")}</h2>
      <p className="mt-1.5 text-xs text-muted-foreground">{t("ac.deleteBody")}</p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-xl border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
        >
          {t("ac.deleteButton")}
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-muted-foreground">
            {t("ac.deletePrompt")}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={typed.trim() !== "DELETE" || busy}
              onClick={remove}
              className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            >
              {busy ? t("ac.deleteBusy") : t("ac.deleteConfirm")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                setTyped("")
                setError(null)
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              {t("ac.deleteCancel")}
            </button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </section>
  )
}
