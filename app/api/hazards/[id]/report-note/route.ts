import { NextRequest, NextResponse } from "next/server"

import { adminEmails } from "@/lib/admin-auth"
import { emailLayout, escapeHtml, sendEmail, sendOnce, siteUrl } from "@/lib/email"
import { hazardKindMeta, type HazardKind } from "@/lib/hazards"
import { reporterHash } from "@/lib/hazard-identity"
import { getHazardStore, NOTE_REPORT_LIMIT } from "@/lib/hazard-store"
import { overLimit } from "@/lib/rate-limit"

/* =========================================================
   POST /api/hazards/:id/report-note
     → { hazard, counted }
     → { error } (404 gone / no note, 429 too many, 503 no store)

   Flags a crowd report's free-text note as offensive or
   inappropriate. One report per person per note; at
   NOTE_REPORT_LIMIT reports the note comes off the public hazard
   and the admins get an email with the removed text. The hazard
   itself (kind + location) stays — only the words are removed.
========================================================= */

export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const store = getHazardStore()
  if (!store) {
    return NextResponse.json(
      { error: "Hazard reporting isn't available yet." },
      { status: 503 }
    )
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: "Missing hazard id." }, { status: 400 })
  }

  const who = reporterHash(request)
  if (await overLimit(`hz-note-report:${who}`, 20, 3600)) {
    return NextResponse.json(
      { error: "Too many reports — try again later." },
      { status: 429 }
    )
  }

  const result = await store.reportNote(id, who)
  if (!result) {
    return NextResponse.json(
      { error: "That note is no longer shown." },
      { status: 404 }
    )
  }

  if (result.removedNote) {
    await emailAdmins(id, result.hazard.kind, result.removedNote)
  }

  return NextResponse.json({ hazard: result.hazard, counted: result.counted })
}

/** Tells the admins a note was taken down, with its text. Never throws. */
async function emailAdmins(id: string, kind: HazardKind, note: string) {
  try {
    const label = hazardKindMeta(kind).label
    for (const to of adminEmails()) {
      await sendOnce(`hz-note-hidden:${id}:${to}`, () =>
        sendEmail({
          to,
          subject: `🚩 Hazard note hidden after ${NOTE_REPORT_LIMIT} reports`,
          html: emailLayout({
            preheader: `A note on a ${label} report was reported ${NOTE_REPORT_LIMIT} times and is now hidden.`,
            emoji: "🚩",
            heading: "A hazard note was hidden",
            paragraphs: [
              `${NOTE_REPORT_LIMIT} different people reported the note on a <strong>${escapeHtml(label)}</strong> report as offensive or inappropriate, so it's been removed from the map. The hazard marker itself stays.`,
              `The removed note was:<br><em>&ldquo;${escapeHtml(note)}&rdquo;</em>`,
              `Nothing to do unless the note was fine — in that case, notes expire with the report, so it will simply be gone when the report does.`,
            ],
            button: { label: "Open the map", href: `${siteUrl()}/app` },
            reason: "You're getting this because your address is in ADMIN_EMAILS for Lincoln Navigation.",
            siteUrl: siteUrl(),
          }),
          text: [
            `A hazard note was hidden after ${NOTE_REPORT_LIMIT} reports.`,
            `Report: ${label} (${id})`,
            `Removed note: "${note}"`,
          ].join("\n"),
        })
      )
    }
  } catch (error) {
    console.error("[hazards] could not email about a hidden note:", error)
  }
}
