/**
 * Intercity route guides for the /routes/[id] pages. English only (the
 * pages are written for search), kept to well-established facts about
 * each road. Road distances come from OSRM's driving route between the
 * two city centres (checked 2026-10-02); travel times are typical door-
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
]

export const findRoute = (id: string) => ROUTE_GUIDES.find((r) => r.id === id)

/** /app link that drops a pin on the route's destination with driving directions open. */
export function routeDirectionsHref(r: RouteGuide): string {
  const params = new URLSearchParams({ lat: `${r.to.lat}`, lng: `${r.to.lng}`, name: r.to.name, mode: "driving" })
  return `/app?${params.toString()}`
}
