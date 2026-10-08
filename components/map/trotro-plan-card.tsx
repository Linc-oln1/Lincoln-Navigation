"use client"

// Trotro trip planner card (BETA, hidden). Shown inside the directions panel
// in Bus mode. Asks /api/trotro/plan, which answers 404 to everyone except
// admins until TROTRO_PLANNER=1 — on a 404 this renders nothing, so the
// panel looks exactly as it did before. English only while it is a beta.

import { useEffect, useMemo, useState } from "react"
import { Bus, Footprints, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Itinerary, LatLng, Leg, TrotroPlan } from "@/lib/trotro/types"

interface TrotroPlanCardProps {
  /** [lng, lat], as the panel stores them. */
  fromLngLat: [number, number]
  toLngLat: [number, number]
  fromName?: string
  toName?: string
  /** Draws the chosen trip on the map. */
  onShowPath: (points: LatLng[]) => void
}

function pathOf(it: Itinerary): LatLng[] {
  const pts: LatLng[] = []
  for (const l of it.legs) {
    if (l.type === "walk") pts.push([l.from.lat, l.from.lng], [l.to.lat, l.to.lng])
    else pts.push(...l.path)
  }
  return pts
}

function describe(leg: Leg): string {
  if (leg.type === "walk") return `Walk about ${leg.minutes} min (${leg.meters} m) to ${leg.to.name}`
  return `Take line ${leg.ref} towards ${leg.headsign || leg.alight.name} from ${leg.board.name}. About ${leg.minutes} min, ${leg.stops} stops. Get off at ${leg.alight.name}.`
}

export function TrotroPlanCard({ fromLngLat, toLngLat, fromName, toName, onShowPath }: TrotroPlanCardProps) {
  const [plan, setPlan] = useState<TrotroPlan | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "off">("loading")
  const [selected, setSelected] = useState(0)

  const key = useMemo(() => `${fromLngLat.join(",")}|${toLngLat.join(",")}`, [fromLngLat, toLngLat])

  useEffect(() => {
    const ctl = new AbortController()
    setState("loading")
    setSelected(0)
    const q = new URLSearchParams({
      from: `${fromLngLat[1]},${fromLngLat[0]}`,
      to: `${toLngLat[1]},${toLngLat[0]}`,
    })
    if (fromName) q.set("fromName", fromName)
    if (toName) q.set("toName", toName)
    fetch(`/api/trotro/plan?${q.toString()}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return setState("off") // 404 = hidden for this visitor; anything else, stay quiet
        const data = (await res.json()) as { plan?: TrotroPlan }
        if (!data.plan) return setState("off")
        setPlan(data.plan)
        setState("ready")
      })
      .catch(() => {
        if (!ctl.signal.aborted) setState("off")
      })
    return () => ctl.abort()
    // fromName/toName only label the walking legs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (state === "off") return null
  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2.5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Looking up trotro lines…
      </div>
    )
  }
  if (!plan) return null

  const chosen = plan.itineraries[selected]

  return (
    <div className="rounded-lg bg-secondary/60 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <Bus className="h-4 w-4 text-primary" aria-hidden />
        <span className="flex-1">Trotro lines</span>
        <span className="rounded border border-primary/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Beta</span>
      </div>

      {!plan.covered && (
        <p className="mt-2 text-muted-foreground">Trotro lines are only mapped for Greater Accra so far, and not for this trip.</p>
      )}
      {plan.covered && plan.itineraries.length === 0 && (
        <p className="mt-2 text-muted-foreground">
          No trotro route found with up to one change. Try Drive or Walk, or pick a nearby main station.
        </p>
      )}
      {plan.walkOnlyMinutes !== null && (
        <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
          <Footprints className="h-3.5 w-3.5" aria-hidden /> About {plan.walkOnlyMinutes} min on foot.
        </p>
      )}

      {plan.itineraries.length > 0 && (
        <ul className="mt-2 space-y-2">
          {plan.itineraries.map((it, i) => {
            const rides = it.legs.filter((l) => l.type === "ride")
            const open = i === selected
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(i)
                    onShowPath(pathOf(it))
                  }}
                  aria-expanded={open}
                  className={cn(
                    "w-full rounded-lg border p-2.5 text-left transition-colors",
                    open ? "border-primary/60 bg-primary/10" : "border-border hover:bg-secondary",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">About {it.totalMinutes} min</span>
                    <span className="text-xs text-muted-foreground">{it.transfers === 0 ? "Direct" : "1 change"}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {rides.map((r, j) => (
                      <span key={j} className="rounded-md bg-foreground/10 px-1.5 py-0.5 text-xs font-medium">
                        {r.type === "ride" ? `Line ${r.ref}` : ""}
                      </span>
                    ))}
                  </div>
                </button>
                {open && chosen && (
                  <ol className="mt-2 space-y-1.5 border-l border-border pl-3 text-xs text-muted-foreground">
                    {chosen.legs.map((l, j) => (
                      <li key={j}>{describe(l)}</li>
                    ))}
                    <li className="text-[11px]">
                      Includes about {chosen.waitMinutes} min of waiting. Trotros leave when full, so this is a guess.
                    </li>
                  </ol>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        Estimates only. Lines come from community mapping ({plan.dataNote.feedDate || "2019"}) and may have changed; there are no real timetables or fares.{" "}
        <a href="/contact" className="underline underline-offset-2">Wrong line? Tell us.</a>{" "}
        Line data © OpenStreetMap contributors (ODbL).
      </p>
    </div>
  )
}
