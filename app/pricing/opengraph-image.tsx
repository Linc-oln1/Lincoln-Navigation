import { ImageResponse } from "next/og"
import { PREMIUM_CURRENCY, PREMIUM_PRICE_PESEWAS } from "@/lib/monetization"
import { OG_SIZE, ogFonts } from "@/lib/og/shared"

// Mirrors /pricing: near-black, violet glow, the Premium card. The price
// comes from the same setting as the page, so it's right as of each build.
export const alt = "Lincoln Navigation pricing — the map is free; Premium and Pro, 31 days at a time"
export const size = OG_SIZE
export const contentType = "image/png"

export default async function Image() {
  const fonts = await ogFonts()
  const whole = Math.floor(PREMIUM_PRICE_PESEWAS / 100).toLocaleString("en")

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          color: "white",
          fontFamily: "Geist",
          backgroundColor: "#07060b",
          backgroundImage: "radial-gradient(circle at 78% 55%, rgba(124,58,237,0.45), rgba(7,6,11,0) 55%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 700, padding: "60px 0 54px 64px" }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 7, color: "#c4b5fd", fontWeight: 700 }}>PRICING</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.02 }}>Every road.</div>
            <div style={{ fontSize: 68, fontWeight: 400, lineHeight: 1.08, color: "rgba(255,255,255,0.9)" }}>One simple price.</div>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.6)", marginTop: 24, lineHeight: 1.4, maxWidth: 560 }}>
              The map is free forever. Extras are paid 31 days at a time, with no auto-renewal.
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#c4b5fd" }}>lincolnnavigation.com/pricing</div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* gradient "border" around the card */}
          <div
            style={{
              display: "flex",
              padding: 2,
              borderRadius: 34,
              backgroundImage: "linear-gradient(180deg, #a78bfa, rgba(109,40,217,0.4) 55%, rgba(255,255,255,0.1))",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 380,
                padding: "34px 34px 40px",
                borderRadius: 32,
                backgroundImage: "linear-gradient(160deg, #261a3d 0%, #140e22 50%, #0d0a15 100%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 30 }}>Premium</div>
                <div style={{ display: "flex", padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,0.08)", fontSize: 16, fontWeight: 700 }}>
                  Recommended
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 26 }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{PREMIUM_CURRENCY}</div>
                <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1 }}>{whole}</div>
              </div>
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", marginTop: 10 }}>per month · paid 31 days at a time</div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 30,
                  padding: "16px 0",
                  borderRadius: 999,
                  background: "white",
                  color: "#12091f",
                  fontSize: 22,
                  fontWeight: 700,
                  boxShadow: "0 0 0 4px rgba(139,92,246,0.55)",
                }}
              >
                Get Premium
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
