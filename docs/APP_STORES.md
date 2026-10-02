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

Apple doesn't accept a sole proprietorship as an organisation, so the
account is enrolled as an **Individual** (seller name: Jonathan Kwaku Abra).
No D-U-N-S needed, and no 12-tester rule.

### What's built (2026-10-02)

- `mobile/ios`: Capacitor 8 (Swift Package Manager — no CocoaPods) loading
  `https://www.lincolnnavigation.com/app?app=ios`. Plugins: Geolocation,
  Haptics, Browser, App, SplashScreen, StatusBar. Info.plist has the
  location-permission text, the `com.lincolnnavigation.app://` URL scheme
  and `ITSAppUsesNonExemptEncryption = false`. Web view starts below the
  status bar. Icon: 1024px upscale of `public/pwa/icon-512.png` (a real
  1024px master would be sharper).
- `lib/native.ts` (website side, used only when `window.Capacitor` exists):
  `geo()` native GPS (one iOS prompt), `hapticTurn()` on each turn
  instruction, `startOAuth()` / `startLinkGoogle()` open Google/Apple
  sign-in in Safari's in-app browser and return via
  `com.lincolnnavigation.app://auth-callback`; `components/native/native-bridge.tsx`
  finishes the sign-in at `/auth/callback` inside the app.
- Sign in with Apple button on /login and /signup, hidden until
  `NEXT_PUBLIC_APPLE_SIGNIN=1` (Apple guideline 4.8, because Google
  sign-in is offered).
- Purchases are hidden in the app by store-app mode (`?app=ios` + UA token).

Verified in the iPhone 17 Pro simulator: site loads, native location
prompt, map follows GPS, layout clear of the notch.

### Still to do

1. Supabase → Authentication → URL Configuration → Redirect URLs: add
   `com.lincolnnavigation.app://**` (in-app Google/Apple sign-in returns
   there).
2. After Apple enrolment: Certificates, IDs & Profiles → create the App ID
   `com.lincolnnavigation.app` with "Sign in with Apple"; create a Services
   ID + key for Supabase's Apple provider; enable Apple in Supabase; set
   `NEXT_PUBLIC_APPLE_SIGNIN=1` in Vercel and redeploy.
3. Xcode: open `mobile/ios/ios/App/App.xcodeproj`, set the Team, add the
   "Sign in with Apple" capability, Product → Archive → upload to App Store
   Connect; test with TestFlight.
4. App Store Connect listing: screenshots (6.9" iPhone), description,
   privacy labels (same data as Play's data safety), demo account
   (lincolnjonathan8+playreview@gmail.com), review note that plans are
   bought on the website and not sold in the app.

Rebuild after native changes:
```bash
cd mobile/ios && npx cap sync ios
```
Website changes need no new App Store build.
