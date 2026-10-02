import { ImageResponse } from "next/og"
import { ROUTE_GUIDES, findRoute } from "@/lib/route-guides"
import { OG_SIZE, ogFonts } from "@/lib/og/shared"

// The share preview for a route guide, in the page's own cream/orange look:
// the two towns, the three numbers people look for, and the stops between.
export const alt = "Lincoln Navigation route guide"
export const size = OG_SIZE
export const contentType = "image/png"

export function generateStaticParams() {
  return ROUTE_GUIDES.map((r) => ({ id: r.id }))
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const r = findRoute((await params).id)
  const fonts = await ogFonts()
  if (!r) return new ImageResponse(<div style={{ display: "flex" }} />, { ...size, fonts })

  const stops = [r.from.name, ...r.via, r.to.name]
  // Keep the strip to one line: both ends plus as many towns as fit.
  const shown = stops.length > 7 ? [...stops.slice(0, 6), "…", r.to.name] : stops
  const stats = [
    { label: "DISTANCE", value: `${r.roadKm} km` },
    { label: "BY CAR", value: r.driveTime },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "56px 64px 50px",
          backgroundColor: "#f4f1e8",
          color: "#1c2a33",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 6, fontWeight: 700, color: "#e8702a" }}>
            ROUTE GUIDE · {r.mainRoad.toUpperCase()}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 22, fontSize: 84, fontWeight: 700, lineHeight: 1 }}>
            <span>{r.from.name}</span>
            <span style={{ color: "#e8702a" }}>→</span>
            <span>{r.to.name}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "18px 26px",
                borderRadius: 22,
                border: "2px solid rgba(28,42,51,0.12)",
                backgroundColor: "rgba(255,255,255,0.65)",
              }}
            >
              <div style={{ fontSize: 17, letterSpacing: 3, fontWeight: 700, opacity: 0.55 }}>{s.label}</div>
              <div style={{ fontSize: 44, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {shown.map((name, i) => (
              <div key={`${name}-${i}`} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <div style={{ width: 26, height: 3, backgroundColor: "rgba(28,42,51,0.25)", margin: "0 10px" }} />}
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: i === 0 || i === shown.length - 1 ? 700 : 400,
                    color: i === 0 || i === shown.length - 1 ? "#1c2a33" : "rgba(28,42,51,0.7)",
                  }}
                >
                  {name}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 700 }}>
            <span>Lincoln Navigation</span>
            <span style={{ color: "#e8702a" }}>lincolnnavigation.com/routes</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
