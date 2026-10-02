import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import sharp from "sharp"
import { GHANA_DESTINATIONS } from "@/lib/ghana-destinations"
import { blurb, categoryName, findDestination, regionName } from "@/lib/place-guide"
import { OG_SIZE, ogFonts } from "@/lib/og/shared"

// The share preview for a place guide: the place's own photo, full bleed,
// with its name over a dark fade. The photos are JPEG copies of the
// /features/places WebPs in lib/og/assets/places — the image renderer
// can't read WebP. The renderer only writes PNG, which for a photo is
// ~1.8 MB; WhatsApp skips previews that big, so it's re-encoded as JPEG.
export const alt = "Lincoln Navigation visitor guide"
export const size = OG_SIZE
export const contentType = "image/jpeg"

export function generateStaticParams() {
  return GHANA_DESTINATIONS.map((d) => ({ id: d.id }))
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const d = findDestination((await params).id)
  const fonts = await ogFonts()
  if (!d) return new ImageResponse(<div style={{ display: "flex" }} />, { ...size, fonts })

  const photo = await readFile(join(process.cwd(), "lib/og/assets/places", `${d.id}.jpg`))
  const src = `data:image/jpeg;base64,${photo.toString("base64")}`

  const png = new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", fontFamily: "Geist", color: "white" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={size.width} height={size.height} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} alt="" />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            backgroundImage: "linear-gradient(180deg, rgba(10,14,18,0) 20%, rgba(10,14,18,0.6) 50%, rgba(10,14,18,0.92) 100%)",
          }}
        />
        {/* The photos' licences ask for credit wherever they're shown. */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 22,
            right: 24,
            padding: "6px 14px",
            borderRadius: 999,
            backgroundColor: "rgba(10,14,18,0.55)",
            fontSize: 15,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {`Photo: ${d.credit.author} · ${d.credit.licence}`}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            position: "relative",
            width: "100%",
            height: "100%",
            padding: "0 64px 52px",
          }}
        >
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 6, fontWeight: 700, color: "#f6a46b" }}>
            {`VISITOR GUIDE · ${regionName(d).toUpperCase()}`}
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.02, marginTop: 14 }}>{d.name}</div>
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.35, marginTop: 14, maxWidth: 940, color: "rgba(255,255,255,0.88)" }}>
            {blurb(d)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 22, fontWeight: 700 }}>
            <span>{`Lincoln Navigation · ${categoryName(d)}`}</span>
            <span style={{ color: "#f6a46b" }}>lincolnnavigation.com/places</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 78, mozjpeg: true }).toBuffer()
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg" } })
}
