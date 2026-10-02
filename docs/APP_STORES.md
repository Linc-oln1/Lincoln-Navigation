# App Store & Google Play

Both store apps are thin native shells around the live site, so every Vercel
deploy updates them. Nothing is bundled; only the shell needs store review.

| | Android (Google Play) | iOS (App Store) |
|---|---|---|
| Shell | Trusted Web Activity (Bubblewrap) | Capacitor 7 |
| Config | `mobile/android/twa-manifest.json` | `mobile/ios/capacitor.config.json` |
| Package / bundle id | `com.lincolnnavigation.app` | `com.lincolnnavigation.app` |
| Opens | `/app?app=android` | `/app?app=ios` + UA token `LincolnNavigationApp` |
| Account | $25 once | $99 / year |

## What the site already does for the stores

- **Store-app mode** (`lib/store-app.ts`). The wrapper is recognised by the
  `?app=` start URL (Android) or the user-agent token (iOS) and remembered in
  the `ln_app` cookie. In that mode:
  - every link to `/pricing` or `/advertise` is hidden (CSS on
    `html[data-store-app]` in `app/globals.css`; add `data-store-hide` to
    hide anything else that sells something);
  - `middleware.ts` redirects those pages to `/app`;
  - `/api/billing/checkout`, `/api/sponsor/checkout` and `/api/sponsor/renew`
    return 403.

  Both stores require their own billing for digital plans. Paystack plans
  bought on the website still unlock in the app after sign-in, which both
  stores allow — just never mention or link to buying inside the app.
- **Account deletion** (required by both stores): "Delete my account" at the
  bottom of `/account` → `POST /api/account/delete` (stops renewing Paystack
  subscriptions, then deletes the Supabase user; tables cascade). Public
  instructions page for the Play listing: `/delete-account`.
- **Android domain verification**: `/.well-known/assetlinks.json`, built from
  the `ANDROID_SHA256_FINGERPRINTS` env var.

## 1. Business identity (do first — takes 1–2 weeks)

Request a free D-U-N-S number for Jonathan Lincoln Enterprise at
<https://developer.apple.com/enroll/duns-lookup/>. Enrol both stores as an
**organisation** with it: the listing then shows the business name, and Google
Play skips the "12 testers for 14 days" rule that applies to new personal
accounts.

## 2. Google Play

1. Create the developer account: <https://play.google.com/console/signup>.
2. Build the app bundle (macOS; Bubblewrap downloads its own JDK + Android SDK
   on first run):
   ```bash
   npm i -g @bubblewrap/cli
   cd mobile/android
   bubblewrap update      # generates the Android project from twa-manifest.json
   bubblewrap build       # first run offers to create android.keystore
   ```
   **Back up `android.keystore` and its passwords** (password manager + a
   second copy offline). Losing it means you can never update the app.
3. Play Console → Create app → upload `app-release-bundle.aab` to
   *Internal testing*. Enrol in **Play App Signing** (default).
4. Play Console → Setup → App signing: copy the **SHA-256** of both the
   *app signing key* and the *upload key*. In Vercel add
   `ANDROID_SHA256_FINGERPRINTS=<app-signing>,<upload>` and redeploy. Check
   <https://www.lincolnnavigation.com/.well-known/assetlinks.json>. Without it
   the app shows a browser address bar.
5. Store listing: name, short + full description, 512×512 icon
   (`public/pwa/icon-512.png`), 1024×500 feature graphic, ≥2 phone
   screenshots.
6. App content:
   - Privacy policy: `https://www.lincolnnavigation.com/privacy`
   - Account deletion URL: `https://www.lincolnnavigation.com/delete-account`
   - Data safety: location (precise, app functionality, not shared), email +
     name (account), purchase history, app interactions (Vercel Analytics),
     crash/diagnostics none. Data encrypted in transit: yes. Deletion: yes.
   - Ads: yes only if AdSense is switched on (`ADS_ENABLED`).
   - Content rating questionnaire; target audience 18+ (or 13+).
   - For a demo account for review, create one with a test email.
7. Promote Internal → Production. Review is usually a few days.

To release a new shell version, bump `appVersionCode` (and
`appVersion`) in `twa-manifest.json`, then `bubblewrap update && bubblewrap build`.
Website changes need no new release.

Local toolchain notes (this Mac, set up 2026-10-02): Bubblewrap CLI in
`~/.bubblewrap/cli`, JDK 17 in `~/.bubblewrap/jdk`, Android SDK in
`~/.bubblewrap/android_sdk` (cmdline-tools under `cmdline-tools/latest`, with a
`bin` symlink at the root so Bubblewrap's path check passes; a `source.properties`
at the SDK root makes Gradle treat the whole SDK as one legacy package and fail
with "Failed to find target android-36"). The generated `build.gradle` was bumped
to AGP 8.13.0 / Gradle 8.13 — re-apply that after any `bubblewrap update`.
Upload key SHA-256:
`45:96:05:49:44:E7:9E:B1:9F:47:44:6E:61:E1:93:01:41:FA:25:2A:24:28:FD:4D:8B:E2:33:7D:8D:E7:68:0D`

## 3. App Store

Apple rejects plain website wrappers (guideline 4.2), so the iOS build has to
add native value before submission. Planned: native GPS
(`@capacitor/geolocation`), push alerts for hazards on a saved route
(`@capacitor/push-notifications`), haptics on turn prompts.

Still to build before submitting to Apple:
- **Sign in with Apple** (guideline 4.8, because Google sign-in is offered):
  enable the Apple provider in Supabase → Auth → Providers and add the button
  on `/login` and `/signup`.
- **Google sign-in inside the app**: Google blocks OAuth in embedded web views
  (`disallowed_useragent`). In the iOS app, start Google sign-in in
  `SFSafariViewController` (`@capacitor/browser`) and return through a
  universal link to `/auth/callback`.
- The native features above.

Setup once those are in:
1. Enrol at <https://developer.apple.com/programs/enroll/> (organisation,
   D-U-N-S). Install Xcode and CocoaPods (`brew install cocoapods`).
2. ```bash
   cd mobile/ios
   npm install
   npx cap add ios
   npx cap open ios
   ```
3. In Xcode: set the Team, add Info.plist strings
   `NSLocationWhenInUseUsageDescription` ("Shows where you are on the map and
   gives turn-by-turn directions.") and, for push, the Push Notifications
   capability. Add the 1024×1024 app icon.
4. Product → Archive → Distribute → App Store Connect. Test with TestFlight.
5. App Store Connect: privacy policy URL, App Privacy labels (same data as the
   Play data-safety form), screenshots (6.7" and 6.5" iPhone), a demo account
   in *App Review Information*, and note that plans are bought on the website
   and the app doesn't sell them.
