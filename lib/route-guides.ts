/**
 * Intercity route guides for the /routes/[id] pages. English only (the
 * pages are written for search), kept to well-established facts about
 * each road. Road distances come from OSRM's driving route between the
 * two city centres (checked 2026-10-02 to 2026-10-04); travel times are typical door-
 * to-door ranges with normal traffic, not free-flow estimates. Fares
 * change often, so the guides never quote them.
 */

export interface RouteEnd {
  name: string
  /** Where the trip starts or ends in that city — the map pin. */
  lat: number
  lng: number
}

export interface RouteGuide {
  /** URL slug: /routes/<id>. */
  id: string
  from: RouteEnd
  to: RouteEnd
  /** Road distance, city centre to city centre. */
  roadKm: number
  /** Typical driving time with normal traffic, e.g. "4½–6 hours". */
  driveTime: string
  /** The main road, e.g. "N6 (Accra–Kumasi Highway)". */
  mainRoad: string
  /** Towns passed in order, not counting the two ends. */
  via: string[]
  /** One sentence for listings and the meta description. */
  summary: string
  /** Paragraphs: the road itself and what to expect driving it. */
  driving: string[]
  /** Paragraphs: buses, trotros and shared taxis. */
  publicTransport: string[]
  tips: string[]
  /** /places guides worth linking from this route. */
  places: string[]
}

export const ROUTE_GUIDES: RouteGuide[] = [
  {
    id: "accra-to-kumasi",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Kumasi", lat: 6.696, lng: -1.623 },
    roadKm: 247,
    driveTime: "4½–6 hours",
    mainRoad: "N6 (Accra–Kumasi Highway)",
    via: ["Nsawam", "Suhum", "Bunso", "Anyinam", "Nkawkaw", "Konongo", "Ejisu"],
    summary:
      "Ghana's busiest intercity road: about 250 km on the N6 from Accra to Kumasi, usually 4½ to 6 hours by car or coach.",
    driving: [
      "The trip follows the N6 the whole way. Leaving Accra you head north-west through Ofankor and Nsawam, then climb through the forest towns of the Eastern Region — Suhum, Bunso and Anyinam — before the road runs below the Kwahu ridge at Nkawkaw, roughly halfway.",
      "After Nkawkaw the road crosses into the Ashanti Region through Juaso and Konongo, and reaches Kumasi through Ejisu. Parts of the highway have been widened to dual carriageway and other stretches are still single lane each way, so expect slow trucks and overtaking on the older sections.",
      "Most of the time lost on this route is at the ends: getting out of Accra past Ofankor and Nsawam, and getting into Kumasi from Ejisu, can each add an hour at peak times.",
    ],
    publicTransport: [
      "Intercity coaches — including STC, VIP and VVIP — run between Accra and Kumasi throughout the day, and are the most comfortable way to travel without a car. Book ahead for Fridays, Sundays and public holidays.",
      "Minibuses and trotros for Kumasi leave from Accra's main lorry stations, such as the Neoplan station at Kwame Nkrumah Circle. They leave when full, so the wait varies.",
    ],
    tips: [
      "Leave Accra before 6 a.m. to miss the worst of the Ofankor–Nsawam traffic.",
      "Nkawkaw is the usual halfway stop for food, fuel and toilets.",
      "Watch for speed checks and slow-moving trucks on the single-lane stretches, especially on bends near the Kwahu ridge.",
    ],
    places: ["aburi"],
  },
  {
    id: "accra-to-cape-coast",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Cape Coast", lat: 5.105, lng: -1.2466 },
    roadKm: 163,
    driveTime: "3–4 hours",
    mainRoad: "N1 (Accra–Cape Coast road)",
    via: ["Kasoa", "Winneba Junction", "Apam Junction", "Mankessim", "Yamoransa"],
    summary:
      "About 160 km west along the coast from Accra to Cape Coast — usually 3 to 4 hours, most of the delay at Kasoa.",
    driving: [
      "The road leaves Accra westwards on the N1 and reaches Kasoa, on the Central Region border, after about 30 km. Kasoa is the main bottleneck of the whole trip: at rush hour it can take longer to get through than to drive the rest of the way.",
      "Past Kasoa the road runs inland of the coast through the junctions for Winneba and Apam, then Mankessim, a busy market town, and Yamoransa, before dropping down into Cape Coast.",
      "Cape Coast is the base for the Central Region's best-known sights — Cape Coast Castle in town, Elmina Castle 15 km further west, and Kakum National Park about 30 km inland.",
    ],
    publicTransport: [
      "Intercity buses, minibuses and trotros for Cape Coast leave from Accra's Kaneshie station, and STC also runs coaches on the route.",
      "Coming back, transport to Accra leaves from Cape Coast's main lorry stations in town.",
    ],
    tips: [
      "Time your trip to avoid Kasoa at rush hour — early morning or mid-morning is usually best leaving Accra.",
      "Mankessim is a good stop for fuel and snacks.",
      "If you are heading to Kakum, go early in the day: the canopy walkway is quieter and cooler in the morning.",
    ],
    places: ["cape-coast", "elmina", "kakum"],
  },
  {
    id: "accra-to-takoradi",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Takoradi", lat: 4.898, lng: -1.76 },
    roadKm: 241,
    driveTime: "4–5½ hours",
    mainRoad: "N1 (coastal highway)",
    via: ["Kasoa", "Winneba Junction", "Mankessim", "Cape Coast", "Komenda Junction"],
    summary:
      "About 240 km along the coast from Accra to Sekondi-Takoradi through Cape Coast — usually 4 to 5½ hours.",
    driving: [
      "The first 160 km is the same as the Accra–Cape Coast trip: west on the N1 through Kasoa, Winneba Junction and Mankessim to Cape Coast.",
      "From Cape Coast the road continues west past the turn-offs for Elmina and Komenda towards the twin city of Sekondi-Takoradi, the Western Region capital and the centre of Ghana's offshore oil industry.",
      "Kasoa is again the main hold-up, and traffic builds up approaching Takoradi in the evening.",
    ],
    publicTransport: [
      "STC and other intercity coaches run between Accra and Takoradi, and minibuses for Takoradi leave from Accra's Kaneshie station.",
      "Going on further west — to Axim, Beyin or Nzulezo — is easiest from Takoradi, where local transport heads along the coast.",
    ],
    tips: [
      "Break the trip in Cape Coast or Elmina if you want to see the castles on the way.",
      "Leave Accra early to get through Kasoa before the morning rush.",
      "Takoradi is the jumping-off point for the beaches and the stilt village of Nzulezo further west.",
    ],
    places: ["elmina", "cape-coast", "nzulezo"],
  },
  {
    id: "kumasi-to-tamale",
    from: { name: "Kumasi", lat: 6.696, lng: -1.623 },
    to: { name: "Tamale", lat: 9.4034, lng: -0.8424 },
    roadKm: 375,
    driveTime: "6–8 hours",
    mainRoad: "N10 (Kumasi–Tamale road)",
    via: ["Offinso", "Techiman", "Kintampo", "Buipe"],
    summary:
      "About 375 km north on the N10 from Kumasi to Tamale, through Techiman and Kintampo — usually 6 to 8 hours.",
    driving: [
      "The N10 leaves Kumasi northwards through Offinso and runs to Techiman, a major market town in the Bono East Region. The forest thins out as you go and the land opens into savanna.",
      "Beyond Techiman the road reaches Kintampo, often called the geographic centre of Ghana, then crosses the Black Volta near Buipe before the long, straight run into Tamale, the Northern Region capital.",
      "The northern half of the road is long and straight with few towns, so it's tempting to speed. Watch for slow trucks, animals and cyclists on the shoulder, especially near villages.",
    ],
    publicTransport: [
      "STC, VIP and other intercity coaches run between Kumasi and Tamale, and many buses from Accra to Tamale also pass through Kumasi. Overnight buses are common on this route.",
      "Minibuses run in shorter hops — Kumasi to Techiman, Techiman to Tamale — if you want to stop along the way.",
    ],
    tips: [
      "Fill up in Techiman or Kintampo — fuel stations are further apart on the northern stretch.",
      "Avoid driving the northern section after dark if you can.",
      "From Tamale, Mole National Park and Larabanga are a few hours west.",
    ],
    places: ["mole", "larabanga"],
  },
  {
    id: "accra-to-tema",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Tema", lat: 5.6698, lng: -0.0166 },
    roadKm: 31,
    driveTime: "30 minutes – 1½ hours",
    mainRoad: "Accra–Tema Motorway",
    via: ["Tetteh Quarshie Interchange"],
    summary:
      "About 30 km from central Accra to Tema, Ghana's main port — 30 minutes off-peak on the motorway, well over an hour at rush hour.",
    driving: [
      "The quickest way is the Accra–Tema Motorway, built in the 1960s as Ghana's first motorway. Join it at the Tetteh Quarshie Interchange and it runs about 19 km east to Tema.",
      "The alternatives are the Spintex Road, which is lined with businesses and often congested, and the coastal road through Labadi, Teshie and Nungua, which is slower but useful when the motorway is jammed.",
      "Tema is a planned city laid out in numbered communities around the harbour, so it helps to know which community you're going to before you set off.",
    ],
    publicTransport: [
      "Trotros for Tema run all day from Accra's Tema station in the city centre, from Kwame Nkrumah Circle and from many stops along the way.",
      "Within Tema, shared taxis and trotros link the communities, the harbour and Ashaiman.",
    ],
    tips: [
      "Avoid the motorway between about 6 and 9 a.m. into Accra and 4 and 8 p.m. out of it.",
      "Check the live map before you leave — an accident on the motorway can make the coastal road the faster choice.",
      "Labadi Beach is on the coastal route if you want a stop on the way.",
    ],
    places: ["labadi", "black-star"],
  },
  {
    id: "accra-to-ho",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Ho", lat: 6.6008, lng: 0.4713 },
    roadKm: 159,
    driveTime: "3–3½ hours",
    mainRoad: "Tema–Akosombo road and N2",
    via: ["Tema", "Atimpoku (Adomi Bridge)", "Juapong"],
    summary:
      "About 160 km from Accra to Ho, the Volta Region capital, crossing the Volta at the Adomi Bridge — usually 3 to 3½ hours.",
    driving: [
      "The trip starts east on the motorway towards Tema, then turns north on the road towards Akosombo through the plains of the Shai-Osudoku district.",
      "At Atimpoku the road crosses the Volta River on the Adomi Bridge, just downstream of the Akosombo Dam, and enters the Volta Region. From there it runs through Juapong, a textile town, and on into the hills around Ho.",
      "The busiest part is leaving Accra and getting past Tema. After that the road is quieter, with some climbs and bends as you approach Ho.",
    ],
    publicTransport: [
      "Intercity buses and minibuses run between Accra and Ho throughout the day from lorry stations in central Accra and in Tema.",
      "From Ho, local transport continues north to Hohoe and the Wli waterfalls, and east towards the Togo border.",
    ],
    tips: [
      "Leave early to get past Tema before the morning traffic.",
      "Atimpoku is the usual stop for food — the roadside sellers are known for grilled tilapia from the Volta.",
      "Akosombo and the dam are a short detour from Atimpoku if you have time.",
    ],
    places: ["akosombo", "wli"],
  },
  {
    id: "kumasi-to-sunyani",
    from: { name: "Kumasi", lat: 6.696, lng: -1.623 },
    to: { name: "Sunyani", lat: 7.3399, lng: -2.3266 },
    roadKm: 122,
    driveTime: "2–3 hours",
    mainRoad: "N6 (Kumasi–Sunyani road)",
    via: ["Abuakwa", "Bechem"],
    summary:
      "About 120 km north-west on the N6 from Kumasi to Sunyani, the Bono Region capital — usually 2 to 3 hours.",
    driving: [
      "The road leaves Kumasi westwards through Abuakwa, then turns north-west through farming country — cocoa, plantain and cassava — in the Ashanti and Ahafo regions.",
      "Bechem, in the Ahafo Region, is the main town on the way. From there the road continues into the Bono Region and reaches Sunyani, its capital.",
      "Getting out of Kumasi through the western suburbs is usually the slowest part of the trip.",
    ],
    publicTransport: [
      "Intercity buses and minibuses for Sunyani leave from Kumasi's main lorry stations, such as Kejetia, throughout the day.",
      "Many buses from Accra to Sunyani also run through Kumasi.",
    ],
    tips: [
      "Avoid leaving Kumasi at rush hour — the western exit can be slow.",
      "Bechem is a convenient halfway stop.",
      "Check the live map for the route from Sunyani on to Techiman and the north.",
    ],
    places: [],
  },
  {
    id: "tamale-to-bolgatanga",
    from: { name: "Tamale", lat: 9.4034, lng: -0.8424 },
    to: { name: "Bolgatanga", lat: 10.7856, lng: -0.8513 },
    roadKm: 162,
    driveTime: "2½–3 hours",
    mainRoad: "N10 (Tamale–Bolgatanga road)",
    via: ["Savelugu", "Pong-Tamale", "Nasia", "Walewale"],
    summary:
      "About 160 km north on the N10 from Tamale to Bolgatanga, the Upper East Region capital — usually 2½ to 3 hours.",
    driving: [
      "The N10 heads straight north out of Tamale through Savelugu and Pong-Tamale, across open savanna dotted with shea trees and farming villages.",
      "It passes Nasia and Walewale in the North East Region, then enters the Upper East Region for the last stretch into Bolgatanga.",
      "The road is mostly flat and straight with light traffic, so the main hazards are speed, livestock and cyclists on the shoulder.",
    ],
    publicTransport: [
      "Minibuses and coaches run between Tamale and Bolgatanga throughout the day, and many buses from Kumasi and Accra to Bolgatanga pass through Tamale.",
      "From Bolgatanga, local transport continues north to Paga and the Burkina Faso border.",
    ],
    tips: [
      "Carry water — it gets very hot in the afternoon, especially in the dry season.",
      "Walewale is the main stop on the way.",
      "Bolgatanga is known for its woven straw baskets, and Paga's crocodile ponds are a short drive further north.",
    ],
    places: ["paga", "larabanga"],
  },
  {
    id: "accra-to-aflao",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Aflao", lat: 6.107, lng: 1.19 },
    roadKm: 194,
    driveTime: "3–4 hours",
    mainRoad: "N1 (Accra–Aflao road)",
    via: ["Tema", "Dawhenya", "Sogakope", "Akatsi", "Denu"],
    summary:
      "About 190 km east on the N1 from Accra to Aflao, on the Togo border — usually 3 to 4 hours.",
    driving: [
      "The trip leaves Accra on the motorway to Tema, then follows the N1 east past Dawhenya and the junctions for Prampram and Ada.",
      "At Sogakope the road crosses the Volta River and enters the Volta Region, then runs through Akatsi and Denu to Aflao, the border town facing Lomé, the capital of Togo.",
      "Traffic around Tema and the queue of trucks near the border are the usual delays.",
    ],
    publicTransport: [
      "Intercity buses and minibuses for Aflao leave from central Accra throughout the day.",
      "If you are crossing into Togo, have your travel documents ready and check the current entry requirements before you go.",
    ],
    tips: [
      "Leave early to clear Tema before the morning rush.",
      "Sogakope, by the Volta bridge, is a good place to stop.",
      "Ada and the Volta estuary are a short detour south from the N1.",
    ],
    places: [],
  },
  {
    id: "accra-to-tamale",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Tamale", lat: 9.4034, lng: -0.8424 },
    roadKm: 622,
    driveTime: "9–11 hours",
    mainRoad: "N6 to Kumasi, then N10",
    via: ["Nsawam", "Suhum", "Nkawkaw", "Konongo", "Kumasi", "Offinso", "Techiman", "Kintampo", "Buipe"],
    summary:
      "About 620 km from Accra to Tamale — the N6 to Kumasi, then the N10 north through Techiman and Kintampo. Usually 9 to 11 hours.",
    driving: [
      "The first 250 km is the Accra–Kumasi trip: the N6 north-west through Nsawam, Suhum and Nkawkaw, then Konongo and Ejisu into Kumasi. Getting out of Accra and through Kumasi are the slowest parts of the whole journey.",
      "From Kumasi the N10 runs north through Offinso to Techiman, then on to Kintampo, where the forest gives way to open savanna. The road crosses the Volta near Buipe and again at Yapei before the last straight run into Tamale.",
      "It is a long day's drive. Most drivers split it at Kumasi or Techiman, and the northern half has long gaps between towns, so plan fuel and rest stops before you set off.",
    ],
    publicTransport: [
      "Intercity coaches — including STC, VIP and VVIP — run between Accra and Tamale every day, and many travel overnight. Book ahead, especially before holidays and festivals in the north.",
      "You can also go in two legs: a coach to Kumasi, then a bus or minibus from Kumasi to Tamale.",
    ],
    tips: [
      "Leave Accra before 5 a.m. or take an overnight coach to avoid both the Accra and Kumasi traffic.",
      "Fill up in Kumasi, Techiman or Kintampo — fuel stations are further apart north of Kintampo.",
      "Tamale is the gateway to Mole National Park and the old mosque at Larabanga, about 3 hours west.",
    ],
    places: ["mole", "larabanga"],
  },
  {
    id: "accra-to-koforidua",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Koforidua", lat: 6.094, lng: -0.2591 },
    roadKm: 89,
    driveTime: "1½–2½ hours",
    mainRoad: "N6 to Suhum, then R41",
    via: ["Achimota", "Amasaman", "Nsawam", "Suhum", "Nankese"],
    summary:
      "About 90 km from Accra to Koforidua, the Eastern Region capital — the N6 to Suhum, then east into town. Usually 1½ to 2½ hours.",
    driving: [
      "The usual route leaves Accra on the N6 through Achimota, Amasaman and Nsawam — the same road as the trip to Kumasi — and turns off at Suhum towards Nankese and Koforidua.",
      "Traffic between Ofankor and Nsawam decides how long the trip takes: off-peak it is well under two hours, at rush hour it can be much longer.",
      "There is also a slower, more scenic way over the Akuapem hills through Aburi and Mamfe, which avoids the N6 entirely and is cooler and greener.",
    ],
    publicTransport: [
      "Trotros and minibuses for Koforidua leave from Accra's main lorry stations, including Kwame Nkrumah Circle, and leave when full.",
      "Koforidua is a regional capital, so transport on to Nkawkaw, Akim Oda and the other Eastern Region towns is easy to find from its stations.",
    ],
    tips: [
      "Leave Accra before 6 a.m. or after the morning rush to get through Ofankor and Nsawam quickly.",
      "Koforidua's bead market, held on Thursdays, is one of the best-known in Ghana.",
      "Coming back, the Aburi road is a nice change and passes the Aburi Botanical Gardens.",
    ],
    places: ["aburi"],
  },
  {
    id: "accra-to-akosombo",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Akosombo", lat: 6.297, lng: 0.051 },
    roadKm: 105,
    driveTime: "2–3 hours",
    mainRoad: "Tema Motorway, then N2",
    via: ["Tema", "Afienya", "Asutsuare Junction", "Kpong", "Atimpoku"],
    summary:
      "About 105 km from Accra to Akosombo and the Volta Lake — the motorway towards Tema, then the N2 north through Kpong. Usually 2 to 3 hours.",
    driving: [
      "The quickest route takes the Accra–Tema Motorway east, then turns north on the N2 past Afienya and Asutsuare Junction towards Kpong.",
      "After Kpong the road follows the Volta River to Atimpoku, where the Adomi Bridge crosses into the Volta Region; Akosombo town and the dam are just upstream.",
      "Traffic on the motorway and around Tema is the main delay. North of Afienya the road is quieter, but watch for trucks and speed checks.",
    ],
    publicTransport: [
      "Trotros and minibuses for Akosombo and Atimpoku leave from Accra's lorry stations for the Volta Region, and leave when full.",
      "From Atimpoku, shared taxis run the short way up to Akosombo town and the dam area.",
    ],
    tips: [
      "Leave early to clear the motorway and Tema before the morning rush.",
      "Atimpoku, by the Adomi Bridge, is known for its roadside fried fish and shrimp.",
      "Boat trips on the Volta Lake leave from the Akosombo area — book ahead at weekends.",
    ],
    places: ["akosombo"],
  },
  {
    id: "kumasi-to-cape-coast",
    from: { name: "Kumasi", lat: 6.696, lng: -1.623 },
    to: { name: "Cape Coast", lat: 5.105, lng: -1.2466 },
    roadKm: 213,
    driveTime: "3½–4½ hours",
    mainRoad: "N8 (Kumasi–Cape Coast road)",
    via: ["Bekwai", "Fomena", "Assin Praso", "Assin Fosu", "Yamoransa"],
    summary:
      "About 210 km south on the N8 from Kumasi to Cape Coast, through Assin Fosu — usually 3½ to 4½ hours.",
    driving: [
      "The N8 leaves Kumasi southwards past Bekwai and through the Adansi area at Fomena, then crosses the Pra River at Assin Praso into the Central Region.",
      "It continues through Assin Fosu, the largest town on the way, and meets the coastal N1 at Yamoransa, a few kilometres from Cape Coast.",
      "Most of the road runs through forest and farmland with long single-lane stretches, so expect slow trucks and plan overtaking carefully.",
    ],
    publicTransport: [
      "Intercity coaches and minibuses run between Kumasi and Cape Coast throughout the day.",
      "For Elmina or Takoradi, change at Cape Coast or stay on a bus that continues west along the coast.",
    ],
    tips: [
      "Assin Fosu is the usual stop for fuel, food and toilets.",
      "Kakum National Park is about 30 km inland from Cape Coast — go in the morning for the canopy walkway.",
      "If you are going on to Elmina, it is only about 15 km west of Cape Coast.",
    ],
    places: ["cape-coast", "elmina", "kakum"],
  },
  {
    id: "kumasi-to-takoradi",
    from: { name: "Kumasi", lat: 6.696, lng: -1.623 },
    to: { name: "Takoradi", lat: 4.898, lng: -1.76 },
    roadKm: 291,
    driveTime: "5–6½ hours",
    mainRoad: "N8 to Yamoransa, then N1",
    via: ["Bekwai", "Fomena", "New Edubiase", "Assin Fosu", "Yamoransa", "Cape Coast", "Komenda Junction"],
    summary:
      "About 290 km from Kumasi to Sekondi-Takoradi — the N8 south to the coast near Cape Coast, then the N1 west. Usually 5 to 6½ hours.",
    driving: [
      "The first part is the Kumasi–Cape Coast trip: the N8 south past Bekwai, through Fomena and New Edubiase, across the Pra River into the Central Region and on through Assin Fosu to Yamoransa.",
      "At Yamoransa the road meets the coastal N1. From there you turn west, pass Cape Coast and the turn-offs for Elmina and Komenda, and cross into the Western Region shortly before Sekondi-Takoradi.",
      "There is also an inland way through Obuasi, Dunkwa-on-Offin and Tarkwa. It is no shorter and has more slow stretches, so most drivers heading straight for Takoradi stay on the N8 and the coast road.",
    ],
    publicTransport: [
      "Intercity coaches and minibuses run directly between Kumasi and Takoradi during the day.",
      "You can also travel in two legs, changing at Cape Coast, which is handy if you want to stop at the castles on the way.",
    ],
    tips: [
      "Assin Fosu is the usual stop for fuel, food and toilets on the N8.",
      "Cape Coast and Elmina are right on the route — a good break about two-thirds of the way.",
      "Traffic builds up approaching Takoradi in the evening, so aim to arrive before dark.",
    ],
    places: ["cape-coast", "elmina", "nzulezo"],
  },
  {
    id: "accra-to-hohoe",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Hohoe", lat: 7.1518, lng: 0.4736 },
    roadKm: 223,
    driveTime: "4–5 hours",
    mainRoad: "Tema Motorway, then N2",
    via: ["Tema", "Afienya", "Kpong", "Atimpoku", "Juapong", "Asikuma", "Peki", "Kpeve", "Have", "Logba Alakpeti"],
    summary:
      "About 225 km from Accra to Hohoe in the Volta Region — the motorway towards Tema, then the N2 north across the Adomi Bridge. Usually 4 to 5 hours.",
    driving: [
      "The route takes the Accra–Tema Motorway east, then the N2 north past Afienya and Kpong to Atimpoku, where the Adomi Bridge crosses the Volta River.",
      "Across the bridge the road passes Juapong and Asikuma, then climbs gently through the hill towns of the Volta Region — Peki, Kpeve, Have and Logba Alakpeti — before reaching Hohoe.",
      "The motorway and Tema are the main delay. North of the bridge the road is single lane each way with bends and villages, so the second half is slower than the distance suggests.",
    ],
    publicTransport: [
      "Minibuses and trotros for Hohoe leave from Accra's lorry stations for the Volta Region, and leave when full.",
      "From Hohoe, shared taxis and trotros run to the nearby villages, including Wli for the waterfall.",
    ],
    tips: [
      "Leave Accra early to clear the motorway and Tema before the morning rush.",
      "Atimpoku, by the Adomi Bridge, is a good halfway stop and is known for its roadside fried fish and shrimp.",
      "Hohoe is the base for Wli Waterfalls, about 20 km to the east near the Togo border.",
    ],
    places: ["wli", "akosombo"],
  },
  {
    id: "tamale-to-mole-national-park",
    from: { name: "Tamale", lat: 9.4034, lng: -0.8424 },
    to: { name: "Mole National Park", lat: 9.2607, lng: -1.8553 },
    roadKm: 146,
    driveTime: "2½–3 hours",
    mainRoad: "N10 to Fufulso, then N7",
    via: ["Yapei", "Fufulso Junction", "Busunu", "Damongo", "Larabanga"],
    summary:
      "About 145 km from Tamale to Mole National Park — the N10 south to Fufulso, then the N7 west through Damongo and Larabanga. Usually 2½ to 3 hours.",
    driving: [
      "Leave Tamale on the N10 towards Kumasi. The road crosses the White Volta at Yapei and reaches Fufulso Junction after about an hour, where you turn west onto the N7.",
      "The N7 runs through Busunu to Damongo, the Savannah Region capital and the last sizeable town before the park. Larabanga is a short drive further on; the park road turns off there and reaches the entrance gate a few kilometres later.",
      "The road is tarred as far as Larabanga and traffic is light, but watch for animals, motorbikes and unmarked speed bumps in the villages.",
    ],
    publicTransport: [
      "Buses and minibuses from Tamale to Damongo and Wa pass through Larabanga. There is little scheduled transport into the park itself.",
      "From Larabanga or Damongo, most visitors take a taxi or motorbike for the last stretch to the park, or arrange a pick-up with their lodge.",
    ],
    tips: [
      "Fill up in Tamale or Damongo — there is no fuel inside the park.",
      "Aim to arrive the afternoon before: the walking and driving safaris with rangers set out early in the morning and again in the late afternoon.",
      "Stop at the old mud-and-stick mosque in Larabanga, right by the park turn-off.",
    ],
    places: ["mole", "larabanga"],
  },
  {
    id: "tamale-to-wa",
    from: { name: "Tamale", lat: 9.4034, lng: -0.8424 },
    to: { name: "Wa", lat: 10.0601, lng: -2.5099 },
    roadKm: 303,
    driveTime: "5–6 hours",
    mainRoad: "N10 to Fufulso, N7 to Sawla, then N12",
    via: ["Yapei", "Fufulso Junction", "Damongo", "Larabanga", "Sawla"],
    summary:
      "About 300 km from Tamale to Wa, the Upper West capital — the N10 to Fufulso, the N7 west past Mole to Sawla, then the N12 north. Usually 5 to 6 hours.",
    driving: [
      "The first half is the road to Mole National Park: the N10 south from Tamale across the White Volta at Yapei to Fufulso Junction, then the N7 west through Damongo and Larabanga.",
      "Past Larabanga the N7 carries on across open savanna to Sawla, where it meets the N12. Turn north there for the last 95 km or so into Wa.",
      "Towns are far apart on this route and there is little traffic. Carry water, keep the tank topped up and avoid driving the long empty stretches after dark.",
    ],
    publicTransport: [
      "Buses and minibuses run between Tamale and Wa during the day, most of them leaving in the morning.",
      "Travellers heading for Mole can take the same transport and get off at Larabanga.",
    ],
    tips: [
      "Fill up in Tamale or Damongo; Sawla is the next reliable stop before Wa.",
      "Leave in the morning so the whole trip is in daylight.",
      "Mole National Park and the Larabanga mosque are right on the way if you want to break the journey.",
    ],
    places: ["mole", "larabanga"],
  },
  {
    id: "accra-to-nkawkaw",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Nkawkaw", lat: 6.55, lng: -0.7686 },
    roadKm: 141,
    driveTime: "2½–3½ hours",
    mainRoad: "N6 (Accra–Kumasi Highway)",
    via: ["Nsawam", "Suhum", "Bunso", "Anyinam"],
    summary:
      "About 140 km on the N6 from Accra to Nkawkaw, the gateway to the Kwahu ridge and roughly halfway to Kumasi — usually 2½ to 3½ hours.",
    driving: [
      "The whole trip is on the N6 towards Kumasi. Leaving Accra you head north-west through Ofankor and Nsawam, then climb through the forest towns of the Eastern Region: Suhum, Bunso and Anyinam.",
      "Nkawkaw sits at the foot of the Kwahu ridge and is where most travellers on the Accra–Kumasi road take a break. The N6 now passes the town on a bypass, so turn off if you want to stop in the centre.",
      "As on the rest of the N6, the slow part is getting out of Accra past Ofankor and Nsawam. After Nsawam the road is faster, but slow trucks and single-lane stretches can hold you up.",
    ],
    publicTransport: [
      "Buses and trotros heading to Kumasi stop at Nkawkaw, and there are also direct vehicles from Accra's main lorry stations such as Neoplan at Kwame Nkrumah Circle. They leave when full, so the wait varies.",
      "From Nkawkaw, local transport goes up the Kwahu ridge to towns such as Atibie and Nkwatia.",
    ],
    tips: [
      "Leave Accra before 6 a.m. to miss the worst of the Ofankor–Nsawam traffic.",
      "Nkawkaw is the usual halfway stop for food, fuel and toilets if you are driving on to Kumasi.",
      "Traffic to the Kwahu ridge is heavy over Easter, when many people travel for the Kwahu festivities; allow extra time.",
    ],
    places: [],
  },
  {
    id: "accra-to-obuasi",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Obuasi", lat: 6.2025, lng: -1.66 },
    roadKm: 282,
    driveTime: "4½–6 hours",
    mainRoad: "N6 to Ejisu, then the N8 south",
    via: ["Nsawam", "Suhum", "Nkawkaw", "Konongo", "Ejisu", "Bekwai"],
    summary:
      "About 280 km from Accra to Obuasi, the Ashanti gold-mining town: the N6 towards Kumasi, then south on the N8 — usually 4½ to 6 hours.",
    driving: [
      "Follow the N6 from Accra through Nsawam, Suhum and Nkawkaw, then on through Konongo to Ejisu on the edge of Kumasi.",
      "From the Ejisu area the route turns south to join the N8 and runs through Bekwai to Obuasi, in the Adansi area. You do not need to go into central Kumasi.",
      "The N6 is busy with trucks and has single-lane stretches, so most of the delay is at the ends: leaving Accra past Ofankor and Nsawam, and getting around Kumasi.",
    ],
    publicTransport: [
      "The simplest way by public transport is in two legs: coaches and trotros run from Accra to Kumasi all day, and from Kumasi there are regular buses and shared vehicles south to Obuasi.",
      "Ask at the lorry stations in central Accra whether a vehicle is going straight through to Obuasi; availability changes.",
    ],
    tips: [
      "Leave Accra before 6 a.m. to miss the worst of the Ofankor–Nsawam traffic.",
      "Nkawkaw is the usual halfway stop for food, fuel and toilets.",
      "If you are going on to Cape Coast, the N8 continues south from Obuasi through Fomena and Assin Fosu.",
    ],
    places: [],
  },
  {
    id: "accra-to-sunyani",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Sunyani", lat: 7.3349, lng: -2.3123 },
    roadKm: 370,
    driveTime: "6½–8½ hours",
    mainRoad: "N6 through Kumasi",
    via: ["Nsawam", "Suhum", "Nkawkaw", "Konongo", "Ejisu", "Kumasi", "Abuakwa", "Bechem"],
    summary:
      "About 370 km from Accra to Sunyani, the Bono Region capital: the N6 to Kumasi and then the N6 on to Sunyani — usually 6½ to 8½ hours.",
    driving: [
      "There is no direct road: you drive to Kumasi and carry on. The first part is the Accra–Kumasi Highway (N6) through Nsawam, Suhum, Nkawkaw and Konongo to Ejisu on the edge of Kumasi, about 250 km.",
      "From Kumasi the N6 continues north-west to Sunyani, about 120 km, through Abuakwa and Bechem.",
      "Most of the delay is at the ends and in Kumasi: leaving Accra past Ofankor and Nsawam, and getting through Kumasi's western side at rush hour. Plan a stop in Kumasi or Nkawkaw to break up a long day.",
    ],
    publicTransport: [
      "Intercity coaches and buses run between Accra and Sunyani, and many go through Kumasi. Ask at the lorry stations in central Accra which ones leave direct.",
      "If there is no direct vehicle, travel in two legs: coaches and trotros run from Accra to Kumasi all day, and from Kumasi there are regular buses on to Sunyani.",
    ],
    tips: [
      "Leave Accra before 6 a.m. to miss the worst of the Ofankor–Nsawam traffic.",
      "Nkawkaw is the usual halfway stop on the Accra–Kumasi stretch, and Bechem is a convenient stop before Sunyani.",
      "Try not to reach Kumasi's western exit at rush hour.",
    ],
    places: [],
  },
  {
    id: "kumasi-to-techiman",
    from: { name: "Kumasi", lat: 6.696, lng: -1.623 },
    to: { name: "Techiman", lat: 7.5833, lng: -1.9333 },
    roadKm: 119,
    driveTime: "2–2½ hours",
    mainRoad: "N10 (Kumasi–Tamale road)",
    via: ["Offinso"],
    summary:
      "About 120 km north on the N10 from Kumasi to Techiman, the big market town of the Bono East Region — usually 2 to 2½ hours.",
    driving: [
      "The whole trip is on the N10, the road to Tamale. It leaves Kumasi northwards through Offinso and runs to Techiman, where the forest thins out and the land starts to open into savanna.",
      "Techiman is a major market town and a junction: the road you are on carries on north to Kintampo and Tamale, and other roads branch off to the west.",
      "Expect slow trucks, especially on the way out of Kumasi and on the single-lane stretches. Watch for animals and cyclists on the shoulder near villages.",
    ],
    publicTransport: [
      "Minibuses and shared vehicles run between Kumasi and Techiman throughout the day, and the coaches that go on to Tamale also pass through.",
      "Techiman is the usual place to change if you are heading further north or west.",
    ],
    tips: [
      "Leave Kumasi early to clear the northern exit before the morning traffic.",
      "Fill up in Techiman; fuel stations are further apart north of it.",
      "Avoid driving the northern roads after dark if you can.",
    ],
    places: [],
  },
  {
    id: "kumasi-to-obuasi",
    from: { name: "Kumasi", lat: 6.696, lng: -1.623 },
    to: { name: "Obuasi", lat: 6.2025, lng: -1.66 },
    roadKm: 64,
    driveTime: "1½–2 hours",
    mainRoad: "N8 south",
    via: ["Bekwai"],
    summary:
      "About 65 km south from Kumasi to Obuasi, the Ashanti gold-mining town, through Bekwai — usually 1½ to 2 hours.",
    driving: [
      "The road leaves Kumasi southwards, the same road that carries on to Cape Coast, and runs through Bekwai to Obuasi in the Adansi area.",
      "It is a short trip, but a busy one: the stretch out of Kumasi can be slow at rush hour and there are many trucks on the way.",
      "If you are going further, the road continues south from Obuasi through Fomena and Assin Fosu towards Cape Coast.",
    ],
    publicTransport: [
      "Buses, minibuses and shared vehicles run between Kumasi and Obuasi throughout the day.",
      "Vehicles for Obuasi leave when full, so the wait varies.",
    ],
    tips: [
      "Leave Kumasi outside rush hour if you can; it is the part that costs the most time.",
      "Check the live map before you leave, since a slow stretch near Kumasi can add time.",
      "For Cape Coast and the coast, see the Kumasi to Cape Coast guide.",
    ],
    places: [],
  },
  {
    id: "accra-to-winneba",
    from: { name: "Accra", lat: 5.57, lng: -0.215 },
    to: { name: "Winneba", lat: 5.3511, lng: -0.6231 },
    roadKm: 63,
    driveTime: "1½–2½ hours",
    mainRoad: "N1 (Accra–Cape Coast road)",
    via: ["Kasoa", "Winneba Junction"],
    summary:
      "About 65 km west from Accra to Winneba on the N1, passing Kasoa and turning off at Winneba Junction — usually 1½ to 2½ hours.",
    driving: [
      "Leave Accra westwards on the N1. After about 30 km you reach Kasoa, on the Central Region border, which is the main bottleneck of the trip: at rush hour it can take longer to get through than to drive the rest.",
      "Past Kasoa the road runs on to Winneba Junction, where you turn off for the town of Winneba on the coast.",
      "The last stretch is quieter. Most of the time you lose is in Accra and at Kasoa, so the hour you leave matters more than the distance.",
    ],
    publicTransport: [
      "Buses, minibuses and trotros for Winneba leave from Accra's Kaneshie station and run through the day, and many Cape Coast vehicles pass the junction.",
      "From Winneba Junction, local transport runs the short distance into town.",
    ],
    tips: [
      "Time your trip to avoid Kasoa at rush hour: early morning or mid-morning is usually best leaving Accra.",
      "If you are going on to Cape Coast, stay on the N1 past the junction.",
      "Check the live map for Kasoa before you set off.",
    ],
    places: [],
  },
]

export const findRoute = (id: string) => ROUTE_GUIDES.find((r) => r.id === id)

/** /app link that drops a pin on the route's destination with driving directions open. */
export function routeDirectionsHref(r: RouteGuide): string {
  const params = new URLSearchParams({ lat: `${r.to.lat}`, lng: `${r.to.lng}`, name: r.to.name, mode: "driving" })
  return `/app?${params.toString()}`
}
