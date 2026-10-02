import { ImageResponse } from "next/og"
import { OG_SIZE, ogFonts } from "@/lib/og/shared"

// Share preview for /trotro, in the same cream/orange look as the route cards.
export const alt = "How to ride a trotro in Ghana — Lincoln Navigation guide"
export const size = OG_SIZE
export const contentType = "image/png"

const STEPS = ["Find the right trotro", "Listen to the mate", "Pay the mate", "Get off at your stop"]

export default async function Image() {
  const fonts = await ogFonts()

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
            GETTING AROUND GHANA
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 84, fontWeight: 700, lineHeight: 1 }}>
            How to ride a trotro
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 28, lineHeight: 1.35, color: "rgba(28,42,51,0.75)", maxWidth: 900 }}>
            The shared minibuses that carry most of Ghana — and the simple system behind them.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {STEPS.map((step, i) => (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "16px 18px 16px 14px",
                borderRadius: 20,
                border: "2px solid rgba(28,42,51,0.12)",
                backgroundColor: "rgba(255,255,255,0.65)",
                fontSize: 19,
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: 999,
                  backgroundColor: "#e8702a",
                  color: "white",
                  fontSize: 18,
                }}
              >
                {i + 1}
              </div>
              {step}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 700 }}>
          <span>Lincoln Navigation</span>
          <span style={{ color: "#e8702a" }}>lincolnnavigation.com/trotro</span>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
