"use client"

import { Fragment, type ReactNode } from "react"
import { useI18n } from "@/components/i18n/language-provider"
import type { MessageKey } from "@/lib/i18n/messages"

/**
 * Fills `{name}` slots in a translated string with elements (links, bold
 * text) instead of plain strings, so each language can put them wherever
 * its word order needs: t("au.agree") → "… our {terms} and {privacy}."
 */
export function fillNodes(text: string, nodes: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/g).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1]
    return <Fragment key={i}>{name && name in nodes ? nodes[name] : part}</Fragment>
  })
}

/**
 * A translated string for use inside server components, which can't call
 * the useI18n hook themselves.
 */
export function T({ k, params }: { k: MessageKey; params?: Record<string, string | number> }) {
  const { t } = useI18n()
  return <>{t(k, params)}</>
}
