// lib/opening-hours.ts
//
// Reads the common shapes of OpenStreetMap's `opening_hours` tag and says
// whether a place is open right now. It understands what most mappers write:
//
//   24/7
//   Mo-Fr 08:00-17:00; Sa 09:00-13:00
//   Mo-Su 08:00-20:00
//   Mo,We,Fr 09:00-12:00,14:00-18:00
//   Mo-Sa 08:00-18:00; Su off
//
// Anything fancier (sunrise/sunset, months, week numbers) makes it return
// "unknown" rather than guess — a wrong "Open now" is worse than none. Public
// holiday rules ("PH off") are skipped: the regular hours are used.
// Ghana doesn't use daylight saving, so "now" is simply UTC.

export type OpenStatus =
  | { state: "open"; closesAt?: string; always?: boolean }
  | { state: "closed"; opensAt?: string }
  | { state: "unknown" }

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] // index = Date#getUTCDay()

interface Interval {
  start: number // minutes from midnight
  end: number // may be > 1440 for overnight ranges
}

interface Rule {
  days: Set<number>
  intervals: Interval[] // empty = closed all day
}

function parseTime(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 24 || min > 59) return null
  return h * 60 + min
}

function parseDays(part: string): Set<number> | null {
  const days = new Set<number>()
  for (const chunk of part.split(",")) {
    const range = /^([A-Z][a-z])(?:-([A-Z][a-z]))?$/.exec(chunk.trim())
    if (!range) return null
    const from = DAYS.indexOf(range[1])
    const to = range[2] ? DAYS.indexOf(range[2]) : from
    if (from < 0 || to < 0) return null
    // Weeks in OSM run Monday → Sunday; walk from `from` to `to` forwards.
    let i = from
    for (let guard = 0; guard < 8; guard++) {
      days.add(i)
      if (i === to) break
      i = (i + 1) % 7
    }
  }
  return days
}

function parseRule(raw: string): Rule | null {
  const text = raw.trim()
  if (!text) return null
  if (/24\/7/.test(text)) {
    return { days: new Set([0, 1, 2, 3, 4, 5, 6]), intervals: [{ start: 0, end: 1440 }] }
  }

  // Split "<days> <times>" — days are optional ("08:00-17:00" alone = every day).
  const match = /^((?:[A-Z][a-z](?:-[A-Z][a-z])?)(?:\s*,\s*[A-Z][a-z](?:-[A-Z][a-z])?)*)?\s*(.*)$/.exec(text)
  if (!match) return null
  const dayPart = match[1]
  const timePart = match[2].trim()

  const days = dayPart ? parseDays(dayPart) : new Set([0, 1, 2, 3, 4, 5, 6])
  if (!days) return null

  if (/^(off|closed)$/i.test(timePart)) return { days, intervals: [] }

  const intervals: Interval[] = []
  for (const chunk of timePart.split(",")) {
    const m = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(chunk.trim())
    if (!m) return null
    const start = parseTime(m[1])
    let end = parseTime(m[2])
    if (start === null || end === null) return null
    if (end <= start) end += 1440 // overnight, e.g. 22:00-02:00
    intervals.push({ start, end })
  }
  return intervals.length > 0 ? { days, intervals } : null
}

function formatMinutes(total: number): string {
  const minutes = ((total % 1440) + 1440) % 1440
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function openStatus(hours: string | undefined | null, now: Date = new Date()): OpenStatus {
  if (!hours) return { state: "unknown" }

  // Later rules override earlier ones for the days they name, like OSM does.
  const rules: Rule[] = []
  for (const piece of hours.split(";")) {
    if (!piece.trim()) continue
    // "PH off" / "SH off" (public / school holidays): very common, and we
    // don't track holiday dates, so these are skipped and the regular hours
    // decide. On an actual holiday a place may differ from what we show.
    if (/^\s*(PH|SH)\b/.test(piece)) continue
    const rule = parseRule(piece)
    if (!rule) return { state: "unknown" }
    rules.push(rule)
  }
  if (rules.length === 0) return { state: "unknown" }

  const dayIntervals = (day: number): Interval[] => {
    let result: Interval[] | null = null
    for (const rule of rules) {
      if (rule.days.has(day)) result = rule.intervals
    }
    return result ?? []
  }

  const today = now.getUTCDay()
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes()
  const yesterday = (today + 6) % 7

  // Today's intervals, plus any overnight tail spilling over from yesterday.
  const current = [
    ...dayIntervals(today).map((i) => ({ ...i })),
    ...dayIntervals(yesterday)
      .filter((i) => i.end > 1440)
      .map((i) => ({ start: i.start - 1440, end: i.end - 1440 })),
  ]

  const open = current.find((i) => minute >= i.start && minute < i.end)
  if (open) {
    const allDay = open.start === 0 && open.end === 1440
    return allDay
      ? { state: "open", always: true }
      : { state: "open", closesAt: formatMinutes(open.end) }
  }

  // Closed: find the next opening in the coming week.
  for (let offset = 0; offset < 7; offset++) {
    const day = (today + offset) % 7
    const starts = dayIntervals(day)
      .map((i) => i.start)
      .filter((start) => offset > 0 || start > minute)
      .sort((a, b) => a - b)
    if (starts.length > 0) return { state: "closed", opensAt: formatMinutes(starts[0]) }
  }
  return { state: "closed" }
}
