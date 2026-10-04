// app/api/admin/ambassadors/route.ts
//
// Admin only (lib/admin-auth.ts).
//   GET                                   → every promoter with live numbers
//   POST { action:"add", email }          → make an existing account a promoter
//   POST { action:"remove", userId }      → stop being a promoter (history kept)
//   POST { action:"email", userId }       → (re)send their welcome email with code + link
//   POST { action:"payout", userId, amountGhs, note? } → record money paid out

import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { listAmbassadors, statsFor } from "@/lib/ambassadors"
import { sendAmbassadorWelcome } from "@/lib/ambassador-emails"
import { ADMIN_ENABLED, createAdminClient } from "@/lib/supabase/admin"

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 })

export async function GET() {
  if (!(await getAdminUser())) return notFound()
  if (!ADMIN_ENABLED) return NextResponse.json({ error: "Supabase service role not configured." }, { status: 501 })
  return NextResponse.json({ ambassadors: await listAmbassadors(createAdminClient()) })
}

export async function POST(req: Request) {
  if (!(await getAdminUser())) return notFound()
  if (!ADMIN_ENABLED) return NextResponse.json({ error: "Supabase service role not configured." }, { status: 501 })
  const admin = createAdminClient()
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  if (body.action === "add") {
    const email = String(body.email ?? "").trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "Enter an email." }, { status: 400 })
    // Find the account by email (they must have signed up already).
    let id: string | null = null
    for (let page = 1; page <= 20 && !id; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      id = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null
      if (data.users.length < 200) break
    }
    if (!id) return NextResponse.json({ error: "No account with that email yet — ask them to sign up first." }, { status: 404 })
    await admin.from("profiles").update({ is_ambassador: true }).eq("id", id)
    const stats = await statsFor(admin, id)
    const emailed = stats?.email ? await sendAmbassadorWelcome({ email: stats.email, name: stats.name, code: stats.code }) : false
    return NextResponse.json({ ok: true, emailed })
  }

  const userId = String(body.userId ?? "")
  if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 })

  if (body.action === "email") {
    const stats = await statsFor(admin, userId)
    if (!stats?.email) return NextResponse.json({ error: "Unknown user." }, { status: 404 })
    const emailed = await sendAmbassadorWelcome({ email: stats.email, name: stats.name, code: stats.code })
    if (!emailed) return NextResponse.json({ error: "Couldn't send — email isn't set up (RESEND_API_KEY) or was refused." }, { status: 502 })
    return NextResponse.json({ ok: true, emailed: true })
  }

  if (body.action === "remove") {
    await admin.from("profiles").update({ is_ambassador: false }).eq("id", userId)
    return NextResponse.json({ ok: true })
  }

  if (body.action === "payout") {
    const amount = Math.floor(Number(body.amountGhs))
    const stats = await statsFor(admin, userId)
    if (!stats) return NextResponse.json({ error: "Unknown user." }, { status: 404 })
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Enter an amount." }, { status: 400 })
    if (amount > stats.owedGhs) {
      return NextResponse.json({ error: `Only GHS ${stats.owedGhs} is owed right now.` }, { status: 400 })
    }
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : null
    await admin.from("ambassador_payouts").insert({ user_id: userId, amount_ghs: amount, note: note || null })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 })
}
