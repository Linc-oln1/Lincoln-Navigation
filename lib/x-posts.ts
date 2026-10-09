// lib/x-posts.ts
//
// The queue for the automatic X poster (app/api/cron/x-post): one post a day,
// in order. These are the X versions from docs/SOCIAL_POSTS.md (Days 1, 3, 4
// and 5 had none there, so a short one was written from the Facebook text).
// All facts come from the route guides. Add new posts at the END of the array;
// the poster remembers how many have gone out, so reordering would repeat or
// skip posts.

const R = "https://www.lincolnnavigation.com/routes"
const P = "https://www.lincolnnavigation.com/places"

export const X_POSTS: string[] = [
  // Day 1
  `Accra → Kumasi: ~247 km on the N6, 4½–6 hrs. The lost time is getting out past Ofankor/Nsawam and into Kumasi from Ejisu.\n\nGuide with the towns on the way and coach vs trotro 👇\n${R}/accra-to-kumasi?utm_source=x\n\nWhat time do you leave?`,
  // Day 2
  `Accra → Cape Coast: ~163 km, 3–4 hrs. Kasoa is where it slows down.\n\nGuide with the stops, bus options and what to see when you arrive 👇\n${R}/accra-to-cape-coast?utm_source=x\n\nWhat time do you leave to beat the Kasoa traffic?`,
  // Day 3
  `Kumasi → Tamale: 375 km, 6–8 hrs, through Techiman, Kintampo and Buipe. Know the towns in order and you can plan fuel and food stops.\n\nRoute guide 👇\n${R}/kumasi-to-tamale?utm_source=x\n\nDrive it often? What would you add?`,
  // Day 4
  `Weekend idea: Accra → Akosombo is ~105 km, 2–3 hrs, via Tema, Kpong and Atimpoku.\n\nGuide with the route and what to expect 👇\n${R}/accra-to-akosombo?utm_source=x`,
  // Day 5
  `Going to Mole? Tamale → Mole National Park is ~146 km, 2½–3 hrs, via Yapei, Damongo and Larabanga.\n\nRoute guide 👇\n${R}/tamale-to-mole-national-park?utm_source=x`,
  // Day 6
  `Accra → Takoradi: ~241 km on the N1, 4–5½ hrs. Kasoa is where it slows down. Cape Coast and Elmina make a good break.\n\nGuide 👇\n${R}/accra-to-takoradi?utm_source=x\n\nStop in Cape Coast or drive straight through?`,
  // Day 7
  `Accra → Ho: ~159 km, 3–3½ hrs. You cross the Volta at the Adomi Bridge at Atimpoku, where the roadside grilled tilapia is the usual stop.\n\nGuide 👇\n${R}/accra-to-ho?utm_source=x\n\nWhat do you order at Atimpoku?`,
  // Day 8
  `Kumasi → Cape Coast: ~213 km on the N8, 3½–4½ hrs, via Bekwai, Fomena and Assin Fosu. Slow trucks on single-lane stretches are the main delay.\n\nGuide 👇\n${R}/kumasi-to-cape-coast?utm_source=x\n\nDriven it lately? How was the road?`,
  // Day 9
  `Accra → Hohoe: ~223 km, 4–5 hrs via the Tema Motorway and N2. Halfway stop at Atimpoku. Wli Waterfalls is about 20 km further east.\n\nGuide 👇\n${R}/accra-to-hohoe?utm_source=x\n\nBeen to Wli? Worth the drive?`,
  // Day 10
  `Kumasi → Sunyani: ~122 km on the N6, 2–3 hrs, via Abuakwa and Bechem. The slow part is leaving Kumasi at rush hour.\n\nGuide 👇\n${R}/kumasi-to-sunyani?utm_source=x\n\nWhat time do you leave Kumasi?`,
  // Day 11
  `Accra → Nkawkaw: ~141 km on the N6, 2½–3½ hrs. Leave before 6 a.m. to miss Ofankor and Nsawam. Heavy traffic to Kwahu at Easter.\n\nGuide 👇\n${R}/accra-to-nkawkaw?utm_source=x\n\nHow early do you leave for Kwahu?`,
  // Day 12
  `Boti Falls: twin waterfalls near Huhunya in the Eastern Region. Fullest in and after the rainy season. Lots of steps down, so wear comfy shoes.\n\nGuide 👇\n${P}/boti?utm_source=x\n\nBeen? Worth the trip?`,
  // Day 13
  `Accra → Sunyani: ~370 km, 6½–8½ hrs. The N6 to Kumasi, then on to Sunyani via Abuakwa and Bechem. Leave before 6 a.m. to miss Ofankor and Nsawam.\n\nGuide 👇\n${R}/accra-to-sunyani?utm_source=x\n\nBreak it in Kumasi or drive through?`,
  // Day 14
  `Kumasi → Techiman: ~119 km on the N10, 2–2½ hrs, via Offinso. Techiman is the big market town where the road carries on north to Tamale. Fill up there.\n\nGuide 👇\n${R}/kumasi-to-techiman?utm_source=x\n\nWhat do you stop for in Techiman?`,
  // Day 15
  `Kumasi → Obuasi: ~64 km, 1½–2 hrs, south through Bekwai. The slow part is leaving Kumasi at rush hour. The same road goes on to Cape Coast.\n\nGuide 👇\n${R}/kumasi-to-obuasi?utm_source=x\n\nHow long does it take you?`,
  // Day 16
  `Accra → Winneba: ~63 km on the N1, 1½–2½ hrs. You pass Kasoa, then turn off at Winneba Junction. Kasoa is what decides your time.\n\nGuide 👇\n${R}/accra-to-winneba?utm_source=x\n\nBefore 6 a.m. or after 9 a.m.?`,
]
