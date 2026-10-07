# Owner checklist

Things only you can do, in the order that matters. Written 7 Oct 2026. Tick them off as you go.
Traffic is the bottleneck (about 90 real Ghana visitors a month), so the first section comes first.

## Every day

- [ ] Post one social post from `docs/SOCIAL_POSTS.md` (16 days are ready: 18 route guides and Boti Falls).
  - Start with Day 1 (Accra to Kumasi), then Day 2, and so on.
  - Join groups as yourself: Ghana travel, trotro, expat and diaspora groups on Facebook, WhatsApp communities, X.
  - Paste the link into a chat with yourself first, so the preview is ready when you post.
  - Reply to every comment in the first few hours.
- [ ] Note which post and which channel (`utm_source`) got visitors. You'll use this on 15 Oct.

## This week

- [ ] **Message Franchman Enterprise** (your only paying sponsor) and ask for four things:
  a one-line promo, their website or Facebook page, an exact shop location (a WhatsApp pin), and how long the listing should run.
  Then send me the answers and I'll update the listing in `/admin/sponsors`.
- [ ] **Recruit 12 or more Android testers** for the 14-day Google Play closed test.
  Each needs an Android phone and a Gmail address.
  Send me the list; I add them in the Play Console, pick Ghana and send release 1.0.0 for review.
  The 14 days only start counting once 12 testers are in, so every day of delay pushes the public launch back.
- [ ] **Try one real referral signup** (I can't create accounts on your live site):
  open your referral link from `/account` in a private window, sign up with a second email you own, confirm it,
  then check that both accounts show 7 days of Pro. Try one by email and, if you can, one with Google.
- [ ] **Open `/admin/hazards` while signed in** and check the page loads. If a hazard is listed, try removing it.
- [ ] **Open the homepage on your phone** and check the still-image hero and the new route-guides scroll look right.
- [ ] **Fill in the placeholders** in `docs/APP_STORE_LISTING.md` (demo account password, your phone number) before you use it.

## Dates to check

| When | What | How |
|---|---|---|
| 10 Oct, 09:00 Seoul time | Franchman's views (baseline was 0 / 0 / 0) | A scheduled task runs and reports. Click "Run now" on it once in the sidebar's Scheduled section first, to approve Chrome access. |
| About 15 Oct | Which posts and routes brought visitors | Search Console > Performance > Pages, plus your analytics referrers. Double down on what worked. |
| 15 to 21 Oct | Are the new guides indexed? | Search Console > Page indexing. "Discovered, currently not indexed" should drop from 7. |
| 15 to 20 Oct | AdSense review | adsense.google.com. It said "Getting ready" on 7 Oct. Don't change the ad tag while it's pending. |
| 14 days after the 12th tester joins | End of the Play closed test | Then ask me to apply for production access. |

## When you're ready (not urgent)

- [ ] **Apple Developer Program** ($99 a year, enrol as an Individual). About 61% of your visitors are on iPhones.
  After enrolment:
  1. Supabase > Authentication > URL Configuration > Redirect URLs: add `com.lincolnnavigation.app://**`.
  2. Create the App ID with Sign in with Apple, a Services ID and a key; enable Apple in Supabase.
  3. Set `NEXT_PUBLIC_APPLE_SIGNIN=1` in Vercel and redeploy.
  4. Xcode: set your Team, add the Sign in with Apple capability, archive, upload, test with TestFlight.
  5. Take 6.9-inch iPhone screenshots (I can generate them) and fill in App Store Connect from `docs/APP_STORE_LISTING.md`.
  Decide first whether to add one native feature (for example push notifications for hazards on a saved route) to lower the risk of a guideline 4.2 rejection ("just a website in a wrapper").
- [ ] **Measure `/app` speed on a real phone.** The lab test scored 38, but it likely overstates the cost of the map. If it feels slow in real life, tell me and I'll optimise it.
- [ ] **Read the new route guides once** (Nkawkaw, Obuasi, Sunyani, Techiman, Winneba) and correct anything you know is wrong. I couldn't verify the drive times, the Obuasi road name or the public-transport lines from a desk.

## Waiting on others (nothing to do)

- AdSense approval (Google).
- Google crawling the pages you submitted for indexing.
- Google's AI Overview catching up on the CEO name. It said "does not publicly disclose" before; the footer and schema fix are live, and it usually updates within a few weeks.
