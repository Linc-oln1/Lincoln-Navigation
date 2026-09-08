// app/ads.txt/route.ts
//
// Serves /ads.txt for Google AdSense. Generated from
// NEXT_PUBLIC_ADSENSE_CLIENT so there's nothing to hand-edit and no
// stale publisher id in the repo. Returns 404 until AdSense is
// configured (an empty/placeholder ads.txt can hurt review).

import { ADS_ENABLED, ADSENSE_CLIENT } from "@/lib/monetization"

export function GET() {
  if (!ADS_ENABLED) {
    return new Response("Not found", { status: 404 })
  }
  // "ca-pub-123..." → "pub-123..."
  const pub = ADSENSE_CLIENT.replace(/^ca-/, "")
  const body = `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
