// app/.well-known/assetlinks.json/route.ts
//
// Digital Asset Links for the Google Play app (a Trusted Web Activity, see
// docs/APP_STORES.md). Proves the app and the site share an owner, which lets
// the TWA run full screen with no browser bar.
//
// Requires env:
//   ANDROID_SHA256_FINGERPRINTS — comma-separated SHA-256 signing-cert
//     fingerprints (AA:BB:…). Add BOTH the upload key and the Play App
//     Signing key from Play Console → Setup → App signing.
// Optional:
//   ANDROID_PACKAGE_NAME (default com.lincolnnavigation.app)

export const dynamic = "force-dynamic"

export function GET() {
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS || "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean)

  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: process.env.ANDROID_PACKAGE_NAME?.trim() || "com.lincolnnavigation.app",
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : []

  return Response.json(body, {
    headers: { "Cache-Control": "public, max-age=3600" },
  })
}
