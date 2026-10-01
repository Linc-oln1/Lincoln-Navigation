import localFont from "next/font/local"

// Playfair Display, self-hosted (SIL OFL), for the /places guide headings.
export const playfair = localFont({
  src: [
    { path: "./playfair-display-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./playfair-display-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
})
