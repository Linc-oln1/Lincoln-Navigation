import { readFile } from "node:fs/promises"
import { join } from "node:path"

/*
 * Shared bits for generated share-preview images. Only /pricing is
 * generated (so it always shows the configured price); the home and
 * /features previews are fixed JPEGs next to their pages, kept small
 * because WhatsApp skips large preview images. Generated images are
 * built once at build time, so reading fonts from disk here is fine.
 * Fonts are Geist (SIL Open Font License).
 */

export const OG_SIZE = { width: 1200, height: 630 }

const ASSETS = join(process.cwd(), "lib/og/assets")

export async function ogFonts() {
  const [regular, bold] = await Promise.all([
    readFile(join(ASSETS, "geist-regular.ttf")),
    readFile(join(ASSETS, "geist-bold.ttf")),
  ])
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: bold, weight: 700 as const, style: "normal" as const },
  ]
}
