/**
 * Visitor guides for the /places/[id] pages — one per destination in
 * lib/ghana-destinations.ts. English only (the pages are written for
 * search); original-wording summaries of public references, kept to
 * well-established facts. Opening hours and fees change, so the guides
 * point people to check on arrival rather than quoting them.
 *
 * `about` reuses the landing page's history text where one exists
 * (hs.fact.* in lib/i18n/home-messages.ts), so the two never disagree.
 */
import { HOME_EN } from "@/lib/i18n/home-messages"

export interface DestinationGuide {
  /** Town or area it's in / reached from — "near Hohoe". */
  near: string
  /** Paragraphs of background. */
  about: string[]
  /** How people usually get there. */
  gettingThere: string[]
  /** Short practical tips. */
  tips: string[]
}

export const DESTINATION_GUIDES: Record<string, DestinationGuide> = {
  kakum: {
    near: "Abrafo, north of Cape Coast",
    about: [HOME_EN["hs.fact.kakum"]],
    gettingThere: [
      "Kakum's visitor centre is at Abrafo, roughly 30 km north of Cape Coast on the road towards Twifo Praso. From Accra, follow the coast road (N1) west to Cape Coast, then turn inland.",
      "Many visitors combine Kakum with Cape Coast and Elmina castles on the same trip, staying a night in Cape Coast or Elmina.",
    ],
    tips: [
      "Go early in the morning: it's cooler, the forest is at its liveliest and queues for the walkway are shorter.",
      "Wear shoes with grip — the walkway and the path up to it can be slippery after rain.",
      "Fees and tour times are set at the visitor centre; check there when you arrive.",
    ],
  },
  "cape-coast": {
    near: "Cape Coast town centre",
    about: [HOME_EN["hs.fact.capecoast"]],
    gettingThere: [
      "The castle sits on the seafront in the middle of Cape Coast, about 145 km west of Accra along the coast road (N1). The drive usually takes three to four hours depending on traffic leaving Accra and through Kasoa.",
      "Trotros and STC/VIP buses run from Accra to Cape Coast through the day; from the station it's a short taxi ride to the castle.",
    ],
    tips: [
      "Take the guided tour — it's how you see the dungeons and the Door of No Return, and the guides tell the story well.",
      "Allow at least an hour and a half for the tour and the museum.",
      "Elmina Castle is about 13 km west, so the two are easy to visit on the same day.",
    ],
  },
  elmina: {
    near: "Elmina, west of Cape Coast",
    about: [HOME_EN["hs.fact.elmina"]],
    gettingThere: [
      "Elmina is about 13 km west of Cape Coast and roughly 160 km from Accra along the coast road (N1). The castle stands at the mouth of the Benya lagoon, beside Elmina's busy fishing harbour.",
      "Shared taxis run often between Cape Coast and Elmina.",
    ],
    tips: [
      "Visits are by guided tour; allow about an hour.",
      "Fort St. Jago, on the hill opposite the castle, gives the best view over the castle and the harbour.",
      "Pair it with Cape Coast Castle and Kakum for a full Central Region trip.",
    ],
  },
  wli: {
    near: "Wli, near Hohoe",
    about: [HOME_EN["hs.fact.wli"]],
    gettingThere: [
      "The falls are reached from Wli village (Wli-Afegame), about 20 km east of Hohoe in the Volta Region, close to the Togo border. From Accra the usual route is north-east through Ho or via the Akosombo/Adomi Bridge road to Hohoe.",
      "From Hohoe, shared taxis and tro-tros run to Wli village; the walk to the falls starts at the visitor office there.",
    ],
    tips: [
      "Register and pay at the visitor office in Wli village before setting off; guides are available there.",
      "The falls are at their most powerful in and just after the rainy season.",
      "Wear good shoes — the upper falls trail is steep and can take a few hours there and back.",
    ],
  },
  mole: {
    near: "Larabanga, west of Damongo",
    about: [HOME_EN["hs.fact.mole"]],
    gettingThere: [
      "Mole's entrance is a few kilometres from Larabanga, west of Damongo in the Savannah Region. Most visitors travel via Tamale, the nearest city and airport, then drive west through Damongo.",
      "Buses run from Tamale towards Larabanga and Mole; arrange onward transport into the park in advance if you aren't driving.",
    ],
    tips: [
      "Walking and driving safaris go out with park rangers — book at the park when you arrive.",
      "Elephants are easiest to see in the dry season (roughly November to April), when they gather at the waterholes.",
      "Larabanga Mosque is about 4 km from the entrance and worth a stop on the way in.",
    ],
  },
  larabanga: {
    near: "Larabanga, near Mole National Park",
    about: [HOME_EN["hs.fact.larabanga"]],
    gettingThere: [
      "Larabanga is on the road between Damongo and Mole National Park in the Savannah Region, about 4 km from the park entrance. Most visitors come via Tamale and Damongo, and stop here on the way to or from Mole.",
    ],
    tips: [
      "The mosque is a working place of worship; visits are arranged with local guides in the village, and visitors are usually shown it from outside.",
      "Dress modestly and ask before taking photos of people.",
    ],
  },
  boti: {
    near: "Huhunya, near Koforidua",
    about: [
      "Boti Falls is a pair of waterfalls in the forest of the Eastern Region, known locally as the \"male\" and \"female\" falls. When the river is high the two streams fall side by side into a pool below, and local tradition says the meeting of the two brings good fortune.",
      "The falls sit inside a forest reserve with walking trails. Nearby are two other well-known sights: Umbrella Rock, a large rock balanced like a canopy, and a palm tree that grows three heads from a single trunk.",
    ],
    gettingThere: [
      "Boti is near Huhunya in the Yilo Krobo area, north-east of Koforidua. From Accra, drive to Koforidua (about two hours) and continue towards Huhunya; the falls are signposted from the road.",
    ],
    tips: [
      "The falls are fullest during and just after the rainy season; in the dry season they can slow to a trickle.",
      "There are many steps down to the pool — and back up — so wear comfortable shoes.",
      "Guides at the entrance can take you on to Umbrella Rock and the three-headed palm.",
    ],
  },
  paga: {
    near: "Paga, on the Burkina Faso border",
    about: [
      "Paga, in Ghana's Upper East Region right on the border with Burkina Faso, is known for its sacred crocodile ponds. Local tradition holds that the crocodiles carry the souls of the community's ancestors, so they are protected rather than hunted, and they have lived alongside people here for generations.",
      "The crocodiles are famously calm, and with a guide visitors can approach — and even touch — one, usually after the guides tempt it out of the water with a chicken.",
    ],
    gettingThere: [
      "Paga is about 40 km north of Bolgatanga, a short way past Navrongo on the main road to the Burkina Faso border. Most people reach it via Tamale and Bolgatanga.",
    ],
    tips: [
      "Only approach the crocodiles with a guide, and follow their lead.",
      "The Pikworo Slave Camp, a sobering site from the slave-trade era, is close by and often visited on the same trip.",
    ],
  },
  nzulezo: {
    near: "Beyin, Western Region",
    about: [
      "Nzulezo is a village built entirely on stilts over Lake Tadane, in the Amansuri wetland of Ghana's Western Region. Homes, a school and a church stand on wooden platforms above the water, linked by walkways, and everyday life — fishing, trading, getting to school — happens by canoe.",
      "According to local tradition, the founders came from the old Ghana Empire in the west, following a snail that led them to the lake. The village is on Ghana's tentative list for UNESCO World Heritage status.",
    ],
    gettingThere: [
      "The trip starts at Beyin, on the coast road west of Takoradi towards the Côte d'Ivoire border. From the visitor centre there, a guided canoe takes you along a channel and across the lake to the village — roughly an hour each way.",
    ],
    tips: [
      "Visits are arranged through the visitor centre at Beyin, where you pay and are assigned a canoe and guide.",
      "Bring sun protection and something to keep your phone dry.",
      "Fort Apollonia, an 18th-century fort, is in Beyin and makes a good stop on the same day.",
    ],
  },
  akosombo: {
    near: "Akosombo, Eastern Region",
    about: [HOME_EN["hs.fact.volta"]],
    gettingThere: [
      "Akosombo is about 100 km north-east of Accra. The usual route is the Accra–Tema motorway or the Dodowa road north to Juapong and Atimpoku, where the Adomi Bridge crosses the Volta just below the dam. The drive takes around two to three hours.",
    ],
    tips: [
      "Tours of the dam are run by the Volta River Authority; ask about them in Akosombo.",
      "Boat cruises on Lake Volta leave from the Akosombo port area on some days.",
      "Atimpoku, by the Adomi Bridge, is known for grilled \"one man thousand\" fish and fresh shrimp from the river.",
    ],
  },
  aburi: {
    near: "Aburi, Akuapem hills",
    about: [
      "Aburi Botanical Gardens opened in 1890 on the Akuapem hills, on land that had held a sanatorium for colonial officials who came up for the cooler air. Its shaded avenues of palms and giant trees — some planted in the garden's earliest years — now make it one of the most popular day trips from Accra.",
      "The gardens have walking paths, a large collection of tropical plants and trees, and picnic lawns. The town around them is known for wood carving.",
    ],
    gettingThere: [
      "Aburi is roughly 35 km north of central Accra, up the winding Aburi road through Peduase. Depending on traffic, the drive takes about an hour; trotros run from Accra (Madina) to Aburi.",
    ],
    tips: [
      "It's noticeably cooler than Accra — a good escape on a hot day.",
      "The wood carving village along the Aburi road is worth a stop for crafts.",
      "Weekends get busy with picnics and events; weekday mornings are quietest.",
    ],
  },
  labadi: {
    near: "La, Accra",
    about: [
      "Labadi Beach, also known as La Pleasure Beach, is Accra's best-known beach, on the coast in La, east of the city centre. At weekends and on holidays it fills with music, food stalls, drummers, dancers and horse rides along the sand.",
      "It's popular for sundowners — the beach bars stay busy into the evening.",
    ],
    gettingThere: [
      "Labadi is in La, a short drive east of central Accra along the coastal Labadi Road. Taxis and ride-hailing cars drop off at the beach entrance.",
    ],
    tips: [
      "There's usually a small entry fee at the beach entrance.",
      "The Atlantic currents here are strong — swim with care and stay close to the shore.",
      "Sunday afternoons are the liveliest; weekday mornings are much quieter.",
    ],
  },
  nkrumah: {
    near: "High Street, central Accra",
    about: [HOME_EN["hs.fact.monument"]],
    gettingThere: [
      "The Kwame Nkrumah Memorial Park is in central Accra, near the seafront on High Street. It's easy to reach by taxi or ride-hailing from anywhere in the city, and it's a short drive from Independence (Black Star) Square.",
    ],
    tips: [
      "Allow an hour for the park, the mausoleum and the museum.",
      "Combine it with Independence Square and Jamestown, both nearby, for a central Accra history walk.",
    ],
  },
  "black-star": {
    near: "Accra seafront",
    about: [
      "Independence Square — often called Black Star Square — is a vast parade ground on the Accra seafront, built in the early 1960s after Ghana's independence. Its landmark is the Black Star Gate, an arch topped by the black star that also sits at the centre of Ghana's flag.",
      "The square hosts national events, including parades on Independence Day (6 March), and is one of the largest city squares in the world. Facing it are the Independence Arch and the Eternal Flame of African Liberation.",
    ],
    gettingThere: [
      "The square is on the coast road in central Accra, a short drive from Osu and the Ministries area. Taxis and ride-hailing cars can drop off right at the square.",
    ],
    tips: [
      "Go early in the morning or late afternoon to avoid the midday heat — there's little shade.",
      "Some areas may be closed during national events or rehearsals.",
      "The Kwame Nkrumah Memorial Park is a short drive away.",
    ],
  },
}

/** Cities each guide gives distances from. */
export const GUIDE_ORIGINS = [
  { name: "Accra", lat: 5.6037, lng: -0.187 },
  { name: "Kumasi", lat: 6.6885, lng: -1.6244 },
  { name: "Tamale", lat: 9.4008, lng: -0.8393 },
] as const
